# n8n workflows

The guest list, RSVPs, QR check-ins and wishes live in **n8n Data Tables**. Two workflows work on them:

| Workflow | File | Triggered by | Does |
| --- | --- | --- | --- |
| **Wedding - Send Invitations** | `workflows/wedding-send-invitations.json` | you, with *Execute workflow* | Sends each guest their own link over WhatsApp (WAHA) and marks them as sent |
| **Wedding - Guest API** | `workflows/wedding-guest-api.json` | the website and the admin desk (webhooks) | Invitation lookup, RSVP, access card, wishes, admin guest list, QR check-in |
| **Wedding - Guest Sheet** | `workflows/wedding-guest-sheet.json` | you, with *Sync guest sheet* / *Reset test guests* | Reads your Google Sheet guest list into the Data Table, makes each guest's token, writes the personal link and RSVP status back to the sheet; resets the test guests |

```text
Data Table wedding_guests ──► Send Invitations ──► WAHA ──► guest's WhatsApp (their own /AlbertStephanie/<token> link)
        ▲                                                         │
        │                                                         ▼
        └────────────── Guest API ◄── website: RSVP, access card (QR = ASW:v1:<token>:<event>)
                            ▲
                            └── admin desk: add guests, scan QR, guest list
```

Each guest has one row. Their **`token`** (64 random hex characters) is the personal id: it is in their link, and it is the secret inside their QR. The QR holds no name.

## 1. Create the Data Tables

In n8n: **Data tables → Create**. Names and columns must match exactly (`id`, `createdAt`, `updatedAt` are added by n8n).

**`wedding_guests`**

| Column | Type | Filled by |
| --- | --- | --- |
| `name` | string | you / admin desk |
| `phone` | string | you / admin desk (`08…`, `+62…`, `62…` all work) |
| `title` | string | you (optional: `Bapak`, `Ibu`, `Bapak/Ibu`…; empty means `Bapak/Ibu`) |
| `max_guests` | number | you / admin desk (1–5): the most the guest may confirm |
| `pax` | number | you / admin desk (optional): the seats you assign; printed on the access card as "N pax". Empty or 0 means the card shows the RSVP count |
| `table_name` | string | you / admin desk (optional): printed on the access card and shown to the usher when the QR is scanned |
| `token` | string | admin desk creates it; if you add rows by hand, paste 64 random hex characters (see below) |
| `invite_sent_at` | string | Send Invitations |
| `rsvp_status` | string | Guest API (`yes` / `no`) |
| `rsvp_event` | string | Guest API (`ceremony` / `reception` / `both`) |
| `rsvp_guests` | number | Guest API |
| `rsvp_request_key` | string | Guest API |
| `rsvp_at` | string | Guest API |
| `ceremony_checkin_at` | string | Guest API (QR scan) |
| `reception_checkin_at` | string | Guest API (QR scan) |

**`wedding_wishes`**: `request_key` (string), `name` (string), `message` (string).

Already created the table? Just add the two columns `pax` (number) and `table_name` (string); existing rows stay valid. Fill them in the Data Table at any time: the card reads them live.

**Guest list in Google Sheets (no phone numbers needed):** upload [`wedding-guest-list-template.xlsx`](wedding-guest-list-template.xlsx) to Google Drive and open it as a Google Sheet (keep the tab named `Guests`). You only type `name`, `guests` (most people they may bring), `pax` (seats) and `table`; `token`, `link` and `status` are filled by n8n. Import **Wedding - Guest Sheet**, attach your Google credential to **Read guest sheet** and **Write back to sheet**, pick the spreadsheet in both, set `siteUrl` in **Settings**, then click **Sync guest sheet**:
- a row with no token becomes a new guest with a random token; its link appears in the sheet,
- a row whose token is known updates name / guests / pax / table only (RSVP and check-in are never overwritten),
- a malformed or repeated token is reported in `status` and skipped; a blank line is ignored; nothing is ever deleted (deleting a sheet row does not delete the guest: remove it in the Data Table),
- `status` shows Belum RSVP / Hadir (event, n orang) / Tidak hadir and check-ins as of the last sync.
Optional: to see each token in the sheet the moment you type a name (before any sync), paste [`google-sheet-tokens.gs`](google-sheet-tokens.gs) into the sheet's Apps Script (Extensions > Apps Script). It writes a random 64-hex token once into the empty `token` cells; the sync then just creates that guest with that token. Don't use a `RANDBETWEEN` formula instead: formulas recalculate and would change every guest's link.
Run it again whenever you add guests or want fresh statuses. Rows without a token are ignored by every other workflow until the sync has run.

**Test guests.** The template has three fixed test guests (token starts with `7e57`). After the first sync they exist in the Data Table:

| Guest | Invitation link | QR text to paste in the admin scanner |
| --- | --- | --- |
| TEST 1 (2 guests, Meja Tes) | `/AlbertStephanie/7e57000000000000000000000000000000000000000000000000000000000001` | `ASW:v1:7e57000000000000000000000000000000000000000000000000000000000001:ceremony` (or `:reception`) |
| TEST 2 (3 guests, Meja Tes) | `/AlbertStephanie/7e57000000000000000000000000000000000000000000000000000000000002` | `ASW:v1:7e57000000000000000000000000000000000000000000000000000000000002:reception` |
| TEST 3 (1 guest) | `/AlbertStephanie/7e57000000000000000000000000000000000000000000000000000000000003` | `ASW:v1:7e57000000000000000000000000000000000000000000000000000000000003:ceremony` |

RSVP is never closed (the site and API have no deadline). It is one-time per link, so after trying one, run **Reset test guests** in the same workflow: it clears RSVP and check-in of the `7e57…` guests only, and you can RSVP and scan again. The QR is only valid after that guest has RSVPed yes for that event. Wishes the testers post stay in `wedding_wishes`: delete those rows by hand. The test tokens are public in this repo, so delete the TEST rows (sheet and Data Table) before sending real invitations.

Easiest way to add guests one by one: the admin desk (**Guest List → Personal invitation links**). To paste many rows at once into n8n instead, give each a unique token, e.g. in a browser console: `crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-','')`.

## 2. Import and configure

Import both files (**Workflows → Import from file**). They are inactive.

**Wedding - Guest API**
1. On **Admin API**, set *Authentication* to **Header Auth** and create a credential: header name `X-Admin-Key`, value a long random string. This is the "admin key"; anyone with it can read the guest list and check people in, so keep it private.
2. Activate the workflow. The URLs become `https://<your-n8n>/webhook/wedding` (public) and `https://<your-n8n>/webhook/wedding-admin` (admin).
3. Optional: in both webhook nodes, change *Allowed Origins (CORS)* from `*` to your site's address(es), e.g. `https://you.github.io,https://invite.example.com`.

**Wedding - Send Invitations**
1. Edit the **Settings** node: `siteUrl` (where the invitation is published), `wahaSession` (your WAHA session name), and `messageTemplate` (the wording is a placeholder: replace it; `{{title}}`, `{{name}}` and `{{link}}` are filled in per guest).
2. On **Send WhatsApp**, attach a Header Auth credential: header name `X-Api-Key`, value your `WAHA_API_KEY`. `wahaUrl` is `http://waha:3000` when n8n and WAHA share the Docker network.
3. Run it with **Execute workflow**. It waits 5–12 seconds between messages. A guest is marked sent only after WAHA accepts the message; guests without a usable phone number are skipped; running it again only retries the ones that are still unsent.

## 3. Point the website at n8n

The site reads one setting, `VITE_N8N_WEBHOOK_BASE`: the webhook base **without** a trailing slash, e.g. `https://n8n.example.com/webhook`.

- **Production builds** (Docker / VPS): set it in `apps/web/.env.production` (use `https://<DOMAIN_N8N>/webhook`) **before the first image build**, and commit it: it is a public address, and `.dockerignore` keeps this one file in the build. The admin desk (`apps/booth`) reads the same file (`envDir`), so one value serves both. Changing it later means rebuilding both images.
- **Local development**: `apps/web/.env.development` already points at `http://localhost:5678/webhook` (n8n from `docker-compose.yml`). Activate the Guest API workflow first, or use n8n's *Listen for test event* with `/webhook-test/`.
- **GitHub Pages** is built in static preview mode (`VITE_DEMO_MODE=true`, see `.github/workflows/pages.yml`) and does not call n8n. To make Pages use the real webhooks, remove that line and set `VITE_N8N_WEBHOOK_BASE` in the workflow's `env`.

Admin desk: open `/admin`, enter the admin key from step 2. It is kept only for that browser tab (`sessionStorage`) and sent as the `X-Admin-Key` header.

## Checking it by hand

```bash
# A guest opens their link
curl -s https://<n8n>/webhook/wedding -H 'Content-Type: application/json' \
  -d '{"action":"invitation","token":"<64-hex-token>"}'

# Admin: list guests (403 without the right key)
curl -s https://<n8n>/webhook/wedding-admin -H 'Content-Type: application/json' -H 'X-Admin-Key: <key>' \
  -d '{"action":"admin-guests"}'
```

Actions on the public webhook: `invitation`, `reservation`, `rsvp`, `wishes-list`, `wish-add`. On the admin webhook: `admin-check`, `admin-guests`, `admin-add-guest`, `admin-reservations`, `checkin`. All rules (limits, one RSVP per invitation, who may enter which event) are in the **Handle guest action** Code node.

## Limits worth knowing

- **Check-in is read-then-write.** Two scans of the *same* card at the very same instant could both be told "admitted". With one gate this is very unlikely; the guest's first time is never overwritten. (The old SQLite backend prevented it with a database constraint.)
- **n8n must be up at the entrance.** Keep a printed guest list as a fallback.
- **No rate limiting.** n8n has none; put the webhook behind your proxy's limits if the link spreads publicly. Tokens are 256-bit, so they cannot be guessed.
- **n8n stores executions.** Request bodies (names, tokens) appear in execution history; set a retention period in n8n if that matters.
- The whole guest list is read on every request. Fine for hundreds of guests, not for tens of thousands.
- These workflows were checked by running their Code nodes and expressions in a test harness and through the real website against a stand-in webhook, **not** inside n8n itself. Do a first pass in n8n (RSVP with one test guest, scan its QR twice) before sending real invitations.

## `forward-data.json`

An older, separate example (webhook → forward the JSON body to another URL, inactive, placeholder destination). It is not used by the invitation.
