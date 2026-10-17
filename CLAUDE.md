# CLAUDE.md

## Project: Birdies-Gift (Wedding Invitation + n8n Automation)

Digital wedding invitation project. Core twist: guest data (name, phone, title/greeting) lives
in a MySQL database (imported from a spreadsheet), and n8n drives the send flow:

```
n8n (trigger) -> takes a phone number
              -> calls backend API to look up the matching guest by phone
              -> backend returns { name, phone, title, ... }
              -> n8n fills a message/file template (e.g. "Yth. Bapak/Ibu {{name}}")
              -> n8n sends it via WAHA (WhatsApp HTTP API)
```

### Tech stack

- **Language:** TypeScript everywhere (backend + tooling).
- **Backend:** Fastify + `mysql2` (raw SQL, no ORM). Table created from `apps/back/schema.sql`.
- **Database:** MySQL (chosen for being lightweight).
- **Automation:** n8n (self-hosted via Docker), calling the backend's HTTP API.
- **WhatsApp sending:** WAHA (WhatsApp HTTP API, self-hosted via Docker).
- **Orchestration:** Docker Compose (mysql, backend, n8n, waha).
- **Guest-facing website:** Vite + React + TypeScript SPA (2 pages, no SSR — chosen for
  being lightweight since the site is intentionally small).

### Repo layout

```
apps/
  back/           TypeScript API (Fastify + mysql2). Source of truth for guest data,
                   exposes the lookup endpoint n8n calls. (Named `back`, not `backend`.)
  web/             Vite + React + TypeScript SPA, 2 pages (structure follows the Invitato
                   reference template the user supplied):
                   - "/"     Cover — photo, A&T monogram, "Let's Begin"
                   - "/rsvp" Invitation — "Dear Mr/Mrs/Ms {?to=}", groom & bride, countdown,
                             event cards, Reservation form (name, attendance; if attending: event + guest count), portrait +
                             2 full-width gallery photos, Kind Words form (name + wishes), closing.
                             Corner flower accents come from components/Florals.tsx.
                   - "/gallery" All gallery photos ("View More" from /rsvp), keeps ?to=
                   All placeholder content + photo paths live in src/data/invitation.ts.
n8n/workflows/     Exported n8n workflow JSON (added once message/file templates exist).
docker-compose.yml Local infra: mysql, backend, n8n, waha.
```

### Conventions

- Keep the backend's public surface minimal: it exists to serve guest data to n8n, not to be
  a general-purpose app backend. Don't add endpoints/features n8n doesn't need.
- Phone numbers are the join key between n8n and the DB — always normalize before comparing
  (see `normalizePhone` in `apps/back/src/server.ts`) since WhatsApp numbers arrive
  in inconsistent formats (`08xx`, `+62`, `62xx`, spaces/dashes).
- Don't invent the message/invitation template — the user is providing a reference template
  for the "Yth. Bapak/Ibu ..." wording and file format. Ask before guessing its structure.
- RSVP submission in `apps/web` doesn't persist anywhere yet (no backend endpoint). Don't
  wire it to the DB without confirming what should be stored.
- Design: mobile-first, 480px column. Palette is slate blue `#708191` (main) / cream `#fbf3de`
  (base) / champagne gold (accent), defined as CSS variables in `apps/web/src/index.css`.
  Text on the invitation page fades up on scroll (IntersectionObserver in `Rsvp.tsx`, no library). Fonts: Playfair Display Italic 400 only
  for the couple's names (monogram uses upright Playfair 400), Montserrat for everything else.
  The monogram (`Monogram.tsx`) is letters + leaf sprig only, no background, colored `--ivory`. Ornaments and the monogram
  are hand-made inline SVG — don't pull in external/Canva assets without the user supplying them.
- The repo lives inside OneDrive, which has silently reverted edits and resurrected deleted
  files mid-session. After big edits, re-check that files still have your changes.

---

## Behavioral guidelines (karpathy-guidelines)

Also installed as a project skill at `.claude/skills/karpathy-guidelines/`. Summarized here so
it's visible without loading the skill:

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop, name what's confusing, ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility"/"configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions your own change made unused; don't remove pre-existing
  dead code unless asked.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
