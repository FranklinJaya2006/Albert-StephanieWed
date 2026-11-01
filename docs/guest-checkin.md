# Reservations and entrance check-in

The invitation now saves reservations and wishes through the Fastify backend. The organizer console is `/admin` on the **invitation domain**, separate from the photo-booth admin on the booth domain. All guest-facing and admin UI text is English.

## Local setup

Use Node.js 24 or newer. Copy the relevant variables from `.env.example` into `apps/back/.env`, then set:

```dotenv
WEDDING_ADMIN_USERNAME=admin
WEDDING_ADMIN_PASSWORD=your-own-unique-password-at-least-12-characters
```

Start both processes from the repository root:

```powershell
npm run dev -w back
npm run dev -w web
```

Vite forwards `/api` to `http://127.0.0.1:4000`. Open the web server's `/admin` URL and sign in with the configured credentials. No account or default password is created automatically. Camera scanning needs HTTPS or localhost; permission must be granted by the operator. Manual QR-content entry is available when a camera is unavailable.

### Try the form without a personal invitation

Run `npm run dev:test -w back` instead of the normal backend command, together with `npm run dev -w web`. Stop the old backend on port 4000 first. This explicit test entry point allows submissions from the normal site link and shows **Try another reservation** after submission. It uses `apps/back/data/wedding-test.sqlite`, separate from the live database. It refuses to start with `NODE_ENV=production`. The production Docker entry point remains `dist/server.js`, never `test-server.js`.

## Production

### GitHub Pages preview (no backend required)

The Pages workflow builds with `VITE_DEMO_MODE=true`. Reservations and wishes use isolated browser storage; no `/api/wedding` requests are sent. Invitation restrictions are disabled, repeat submissions are available, and the gallery, photo-topped QR cards and PNG downloads work as a static preview. Demo QR codes use `ASW:demo:…` and are rejected by the real check-in API. Admin sign-in and real check-in require the server-hosted site.

To run the same preview locally, use `npm run dev:demo -w web`, or `npm run build:demo -w web` followed by `npm run preview -w web`. No backend process is needed. The normal build (used by Docker/VPS) remains connected to the live API. This preview stores data only in the same browser; it does not synchronize guests between devices.

### Server-hosted site

1. Add `WEDDING_ADMIN_USERNAME` and `WEDDING_ADMIN_PASSWORD` to the VPS environment file described in `.env.prod.example` before deploying.
2. Use the existing VPS/Caddy deployment. Its invitation domain proxies `/api/wedding/*` to the backend. GitHub Pages runs the static demo described above; use the VPS domain for real reservations and admin.
3. The backend stores SQLite in `/data/wedding.sqlite`, using the existing `booth_data` named volume. Do not remove that volume when updating containers. Local development defaults to `apps/back/data/wedding.sqlite`.
4. Back up the database using SQLite's backup mechanism or stop the backend before copying the file. Do not copy only the main file from a running WAL database. Keep access-card links and backups private.

## Guest flow

- First create each guest/family's personal link in **Admin → Guest List → Personal invitation links**. Choose their name and maximum party size, then send that private URL.
- One personal invitation permits exactly one RSVP. The database enforces a unique invitation reference. Reopening the link, changing the request ID, or sending simultaneous requests returns the original reservation/QR; it does not change attendance or create another reservation. The saved guest name comes from the organizer's invitation.
- Live submissions without a valid personal link are blocked. For local trials only, set both `NODE_ENV=test` and `WEDDING_ALLOW_TEST_RESERVATIONS=true` on the backend. A frontend URL flag cannot bypass the restriction. Production wiring never enables that flag.

- A successful form submission creates a server-issued reservation ID and a 256-bit access token. Retries of the same submission reuse the request key and do not create duplicate reservations.
- The card's QR is `ASW:v1:<access-token>:<ceremony-or-reception>`. The token does not contain the guest's name. Each event has a separate QR but retains the same reservation ID.
- The saved card URL contains the access token; it can reopen the reservation from the database on another device. Local storage only remembers this link, not the authoritative reservation or check-in status.
- Declined reservations are listed in admin but receive no entrance pass.
- Old sandbox/local-only QR codes are not valid check-in passes. Guests using those cards must submit a new reservation through the connected backend. Old sample browser data is not silently imported into production.
- Wishes are saved centrally and shown to visitors (latest 100). Names and messages render as text.

## Admin flow

**Scan QR:** choose the entrance event, start the camera, scan the corresponding card. Successful scans admit the reservation's whole party and persist the timestamp. The camera stops after each result; start it again for the next guest. A second scan of the same card/event reports **Already checked in** without adding another admission. A different event, forged code, old sandbox code, or declined RSVP is rejected.

**Guest List:** search name/reservation ID and filter by event, attendance, check-in status, and submission date. Results are paginated (30 per page). Submission-date filtering uses UTC; displayed timestamps use WITA. When an event filter is selected, check-in status is evaluated for that event. Without one, “Checked in” means at least one event was scanned. “Admissions across events” counts a party again if it attends both events; it is not a count of unique people. Click Search / Refresh to retrieve current data.

Admin sessions are 12-hour HttpOnly cookies (Secure in production). Admin routes require a session, cross-site writes are blocked, login attempts are limited, and scan uniqueness is enforced in the database. Keep organizer credentials on the server, not in frontend environment variables or query strings.

## Verification

```powershell
npm test -w back
npm run build -w back
npm run build -w web
npm run lint -w web
```

Backend integration tests exercise a real SQLite database, Fastify route requests, rejected access, duplicate scans, event filters, pagination, wishes, and restart persistence. Camera hardware and an actual production deployment require a final device check.
