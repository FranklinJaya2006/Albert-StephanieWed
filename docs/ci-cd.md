# CI/CD and VPS preparation

The invitation remains the primary product. GitHub Pages continues to publish its static preview independently of the VPS workflows. The live invitation and admin use one shared Fastify backend and SQLite database.

| Workflow | Changes that trigger it | Checks and deployment |
| --- | --- | --- |
| `pages.yml` | Invitation assets/source, root dependency files | Builds only `web`, publishes the existing GitHub Pages demo |
| `web.yml` | Invitation, backend, shared dependencies | Checks invitation + backend, publishes `-web` and `-back`, updates web + API |
| `admin.yml` | Admin, its imported invitation modules, backend, shared dependencies | Checks admin + backend, publishes `-admin` and `-back`, updates admin + API |
| `edge.yml` | Routing, Compose, n8n workflow exports, deployment updater, shared build/deploy files | Validates Compose, n8n JSON and updater, publishes/restarts only HTTPS proxy |
| `_component.yml` | Reused by the three VPS workflows | Common checks, Docker cache, publishing and SSH deployment |

All VPS workflows support **Run workflow**. Pull requests run checks and Docker builds without publishing or deploying. Pushes/dispatches on `main` publish commit-SHA and `latest` image tags. A backend change intentionally triggers both the web and admin checks, because they share that API. There is no separate backend workflow to manage.

An admin release includes the API used for QR scans and guest lists; an invitation release includes the API used for RSVP and wishes. These remain one running backend service and one database, rather than two independent databases.

## Before renting the VPS

Leave repository variable `DEPLOY_ENABLED` unset or `false`. GitHub Pages and CI still run, images can be published to GHCR, and no SSH deployment is attempted. A failed admin/API check does not block the independent GitHub Pages build.

## First VPS setup

1. Install Docker Engine with the Compose plugin, Bash and `flock` (normally provided by util-linux on Ubuntu). Allow ports 80/443 and point invitation/admin/n8n DNS records to the VPS.
2. Create the deploy folder, e.g. `/opt/birdies-gift` or `~/ASWed`, owned by the deploy user. If it is not `/opt/birdies-gift`, set repository **Variable** `DEPLOY_PATH` to its path (a relative path such as `ASWed` is taken from the deploy user's home). Copy `docker-compose.prod.yml` and `deploy/update-service.sh` there. Copy `.env.prod.example` as `/opt/birdies-gift/.env` and fill the server-side values, including `WEDDING_ADMIN_USERNAME` and `WEDDING_ADMIN_PASSWORD`. Local `apps/back/.env` is deliberately never uploaded by CI.
3. Run the web, admin and proxy workflows on `main` to publish all four images. Ensure `IMAGE_PREFIX` in the server `.env` is the lowercase `ghcr.io/<owner>/<repository>`.
4. If GHCR packages are private, sign in to GHCR on the VPS with a read-packages credential for the initial pull. Keep this credential out of Git.
5. Bootstrap the entire stack once on the VPS:

```bash
cd /opt/birdies-gift
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --wait --wait-timeout 180
```

6. Add repository **Secrets**: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, optionally `VPS_PORT` (default 22). SSH host keys must match the actual VPS. The deploy user must be allowed to use Docker.
7. After bootstrap succeeds, set repository **Variable** `DEPLOY_ENABLED=true`. Subsequent matching changes deploy automatically.

Public URLs: `DOMAIN_WEB` for the invitation; `DOMAIN_BOOTH` (legacy variable name) for the dedicated admin at `/`. Camera scanning needs HTTPS. The admin login has no registration step; it checks the predefined server credentials.

## Updates and rollback

The proxy is now a small independent image; it routes to internal `web`, `admin` and `back` containers. Frontends and backend are not exposed directly on public ports. Routine deployments use `--no-deps`, preserve named data volumes, and wait for the selected services to be healthy. The web/admin backend is updated as part of either application workflow.

The server records each successful component tag in `.image-tags.env`. That file is kept on the VPS and ignored by Git. Per-component tags stop one application's deployment from changing the other application's version. The shared API also tracks the latest deployment run so a slower older application build cannot downgrade that API. A failed pull/update does not overwrite the saved tag state; an update failure still requires inspecting running containers and manually rolling back if needed.

Deploy jobs use a shared non-cancelling queue, and the updater also takes a VPS file lock. GitHub's `queue: max` prevents one component's queued deployment from replacing another pending component. See [GitHub concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency). Some actionlint releases do not yet recognize that documented key; local validation excludes only that diagnostic.

To roll back on the VPS, choose a previously published commit SHA:

```bash
cd /opt/birdies-gift
bash update-service.sh web <previous-sha>    # invitation + shared API
bash update-service.sh admin <previous-sha>  # admin + shared API
bash update-service.sh edge <previous-sha>   # HTTPS proxy
```

Manual rollback also restores the shared API for the selected application; check compatibility with the other frontend. Database migrations/data are not automatically rolled back. Preserve/back up the existing `booth_data` volume: it now contains the wedding database.

When managing the full stack later, retain the saved component pins:

```bash
docker compose --env-file .env --env-file .image-tags.env -f docker-compose.prod.yml up -d --wait
```

For a manual rollback use the VPS script rather than rerunning an older Actions run; older run IDs are intentionally skipped to prevent accidental stale deployments.

## Verification

`bash deploy/test-update-service.sh` tests selected-service updates, web/admin shared API tags, preservation of other components, stale releases, rejected input and failed pulls using a mock Docker command. Compose can be validated without a running Docker engine using placeholder environment values. Actual image builds, Caddy image validation and a VPS rollout require Docker/a provisioned server.

## n8n (guest list, RSVP, QR) on the VPS

CI/CD ships the website, admin and proxy images; it does **not** import n8n workflows or create Data Tables. After the first bootstrap, do that once by hand following [`n8n/README.md`](../n8n/README.md) (create the owner account first, Data Tables, import both workflows from `n8n/workflows/`, attach the two Header Auth credentials, activate). Re-import a workflow whenever its JSON changes. `edge.yml` only checks that the exports are valid JSON.

The frontends call n8n at the address in `apps/web/.env.production` (`VITE_N8N_WEBHOOK_BASE`, shared by the web and admin builds). Set it to `https://<DOMAIN_N8N>/webhook` and commit it before the first image build.
