# CLAUDE.md

## Project: Birdies-Gift (Wedding Invitation + n8n Automation)

Digital wedding invitation project. Core twist: guest data (name, phone, title/greeting) lives
in an n8n Data Table (no SQL database anywhere), and n8n drives the send flow:

```
n8n (trigger) -> takes a phone number
              -> normalizes it (Code node) and looks up the guest in the Data Table
              -> n8n fills a message/file template (e.g. "Yth. Bapak/Ibu {{name}}")
              -> n8n sends it via WAHA (WhatsApp HTTP API)
```

### Tech stack

- **Language:** TypeScript everywhere (backend + tooling).
- **Backend:** Fastify, photo booth only. No database: photos are files on disk.
- **Guest data:** n8n Data Table (guest list is small; photos must never go in it — size limit).
- **Automation:** n8n (self-hosted via Docker) reads the Data Table directly.
- **WhatsApp sending:** WAHA (WhatsApp HTTP API, self-hosted via Docker).
- **Hosting:** one VPS running `docker-compose.prod.yml` (Caddy edge + back + n8n + waha),
  deployed by GitHub Actions (`.github/workflows/ci-cd.yml`) via GHCR images.
- **Guest-facing website:** Vite + React + TypeScript SPA (2 pages, no SSR — chosen for
  being lightweight since the site is intentionally small).

### Repo layout

```
apps/
  back/           TypeScript API (Fastify) for the photo booth only. (Named `back`, not `backend`.)
  web/             Vite + React + TypeScript SPA, 2 pages (structure follows the Invitato
                   reference template the user supplied):
                   - "/"     Cover — photo, A&T monogram, "Let's Begin"
                   - "/rsvp" Invitation — "Dear Mr/Mrs/Ms {?to=}", groom & bride, countdown,
                             event cards, Reservation form (name, attendance; if attending: event + guest count), portrait +
                             4 gallery photos in an even 2×2 grid (`portraits` in data; "" = placeholder), Kind Words form (name + wishes), closing.
                             Corner flower accents come from components/Florals.tsx.
                   - "/gallery" All gallery photos ("View More" from /rsvp), keeps ?to=
                   All placeholder content + photo paths live in src/data/invitation.ts.
  booth/           Separate photo-booth app (Vite + React + TS, dev port 5175), same theme.
                   Guests scan a QR → enter a name → camera → pick "Frame" or "Warm Film" →
                   capture → upload. Private results at /admin?key=<BOOTH_ADMIN_KEY> so the
                   couple can pick the best shot (username = who took it). Filters are in
                   src/filters.ts and drawn identically for live preview and saved photo.
                   Camera needs https (or localhost).
n8n/workflows/     Exported n8n workflow JSON (added once message/file templates exist).
deploy/            Dockerfile.back, Dockerfile.edge (builds web + booth, serves via Caddy), Caddyfile.
docker-compose.yml        Local dev only: n8n + WAHA.
docker-compose.prod.yml   VPS stack; values come from the server's .env (see .env.prod.example).
.github/workflows/ci-cd.yml  PR: lint + build + image build. main: push images, deploy over SSH
                   (skipped until repo variable DEPLOY_ENABLED=true).
```

### Conventions

- Keep the backend's public surface minimal: only the photo-booth endpoints (`/api/booth/*`:
  public upload, admin-key-gated list/files) plus `/health`. Each photo is `<id>.jpg` + a
  `<id>.json` sidecar in `UPLOAD_DIR` (default `apps/back/uploads/booth/`, `/data/booth` in
  Docker); the sidecar is written last. Don't reintroduce a database for this.
- Phone numbers are the join key in the n8n Data Table — normalize inside n8n (Code node)
  before comparing, since WhatsApp numbers arrive in inconsistent formats (`08xx`, `+62`,
  `62xx`, spaces/dashes): strip non-digits, then turn a leading `0` into `62`.
- Docker/CI could not be run locally (Docker kept off on purpose). The first GitHub Actions run
  is the real test of the Dockerfiles and the Caddyfile (validated at image build time).
- Photo originals in `apps/web/public` are named `X.jpg`; only `X-web.jpg` ships (see
  `.dockerignore`). A new photo used by the app must follow that naming.
- Keep every `*-web.jpg` small (about 1200px wide, a few hundred KB). A 17 MB `Portrait-web.jpg` once made fast scrolling
  lag and flash the page background. The page/body background is cream on purpose, so any unpainted area shows paper, not blue.
- Cover/desktop photo is `couple-cutout-web.jpg` (a plain portrait photo, not a cutout: sized `cover`, not mirrored).
- Don't invent the message/invitation template — the user is providing a reference template
  for the "Yth. Bapak/Ibu ..." wording and file format. Ask before guessing its structure.
- RSVP submission in `apps/web` doesn't persist anywhere yet (no backend endpoint). Don't
  wire it to the DB without confirming what should be stored.
- Design: mobile-first, 32rem column. Sizing is fluid: the root font-size is
  `clamp(15.5px, 4.1vw, 18px)` (desktop: `clamp(16px, 1.25vw, 20px)`) and everything else is in
  rem, so add new sizes in rem — not px — or they won't scale. Palette is slate blue `#708191` (main) / cream `#fbf3de`
  (base) / champagne gold (accent), defined as CSS variables in `apps/web/src/index.css`. The cream is the one
  background for every section, card and the opening overlay, with a paper grain on top (`--paper-texture`,
  inline SVG noise, no image asset) — no slate or white panels; keep the grain faint so the cream stays cream.
  Text on the invitation page fades up on scroll (IntersectionObserver in `Rsvp.tsx`, no library).
  The opening bloom runs ~7s (`--bloom-duration`); it closes only on its own
  `flower-reveal-exit` animation — pseudo-element animations fire animationend on it too. Fonts: Playfair Display Italic 400 only
  for the couple's names (monogram uses upright Playfair 400), Montserrat for everything else.
  The monogram (`Monogram.tsx`) is letters + leaf sprig only, no background, colored `--ivory`. Ornaments and the monogram
  are hand-made inline SVG — don't pull in external/Canva assets without the user supplying them.
  Cards, countdown tiles and frames are plain rectangles (2–4px radius), no arches or cut corners. Every content photo (groom, bride,
  love story, the 4 gallery photos) uses one frame, `FramedPhoto` (`.photo-frame`/`.framed-photo`): 0.9rem corners, picture inset in
  a thin gold border with an outer hairline, and `PhotoBorderOrnament` on the bottom edge. Don't give any photo its own
  border style; the cover photo is full-bleed. No photo has a torn/paper-cut edge (removed on request). Groom and bride
  are joined by an `<Ornament />`.
  Every flower, leaf and bud comes from `Flower.tsx` (a rose seen from above: petals spiral out at the golden angle, pale slate blue, a fine spiral at the heart; `deep` 1 = deeper slate heart, never navy) so the corner garlands (`Florals.tsx`), the opening animation (the Reservation section has no flower, ornament or card: title, a line of text, then the form directly on the paper)
  all match; don't draw a second flower style. Flowers are solid, never faint, so a section that
  has corner florals reserves their height as padding (`--florals-space`) and content can't be
  covered. If you resize a garland, keep its 180×110 viewBox and that padding in step.
  Opening (`FlowerReveal.tsx`): a tone-on-tone arrangement (`FlowerBloom`: 12 roses of one slate blue, light and deep, over a fan of slate foliage; foliage first, then roses open one by one; each rose and the foliage is its own small <svg> animated with transform/opacity only), glow, rings and sparkles sit centred in a circle (`.flower-reveal-stage`) with
  the caption underneath; the cream paper backdrop fades in over the cover, the open button disappears once pressed (the opening plays only once); `App` jumps to the
  invitation once it is opaque (`onCovered`), the slate-blue bloom opens, then the overlay fades out.
  Keep an `animationend` on `.flower-reveal-bg` even under reduced motion — `onCovered` waits for it.
  Keep the opening smooth: animate only transform/opacity on separate elements (never shapes inside one big SVG, never
  blur/letter-spacing/filters). Heavy work happens off-screen: `App` builds the invitation hidden and the overlay paused
  shortly after load (300ms), preloads the photos, then un-hides the invitation only once the overlay is opaque
  (`reveal`, with `flushSync`); the fade-up observer starts only after the overlay is gone. `Florals`/`FlowerBloom`
  are `memo`ized so state changes don't re-render their SVGs. Measure with a rAF frame logger if you change this.
- Two deploy targets: the VPS (ci-cd.yml: Docker, includes booth/back/n8n) and GitHub Pages (pages.yml: only `apps/web`,
  static, built with `VITE_BASE=/<repo>/`; Settings > Pages > Source must be "GitHub Actions"). Because Pages serves from a
  subfolder, never hard-code a leading `/` for assets: photo paths go through `asset()` in `data/invitation.ts`. Pages
  strips full-size originals (only `*-web.jpg` ships), same as the Docker image.
- Background music: `music` in `data/invitation.ts` ("" = none), file in `public/music/` (see its README). It starts from the
  open-button press (a user tap, which browsers require) and `MusicToggle` mutes it. Only use a song the couple may use.
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
