# Right Court SC — Site Map & Content Structure

## Navigation (v1)
```
Home | Drills & Sessions | Gallery | About / Join
```
Keep the nav to 4 items max for mobile — this should sit comfortably as a hamburger menu on small screens and a simple horizontal bar on desktop.

## Page-by-page

### 1. Home (`/`)
- Hero: logo (solid badge on a forest-green hero background, or line-art badge on white — pick per Phase 0 design direction), one-line tagline, "EST. 2026."
- Short intro paragraph: who the club is, who it's for (recreational, intermediate–advanced).
- "Next session" block — date/time/location if the committee wants to maintain this (can be a manually-edited field to start; no need for a booking system in v1).
- Three feature tiles linking to Drills & Sessions, Gallery, and the AI Drill Builder.
- Footer: contact/join info, a persistent "Drill Builder" link (the only other entry point to `/drill-builder/` besides the homepage tile), logo monogram, copyright.

### 2. Drills & Sessions (`/drills/`)
- Landing view: card grid of published session plans, each card showing session number, theme, and date.
- Filter/tag by skill theme (length, volleys, drops, boasts, movement, front-court, deception, serves/returns) — even a simple client-side filter (no backend needed) is enough for v1.
- Each session plan gets its own page (`/drills/session-01-straight-length-and-the-t/`), rendered from the same structure as the plans already being produced: theme, timeline table, drill details (setup/pattern/coaching points/success criteria/regression/progression), games details, court split, coach's notes.
- **Content source:** session plans are written as Markdown in `/content/sessions/session-XX-slug/session.md` (one folder per session, matching the page's URL slug) — see `03-TECHNICAL-ARCHITECTURE.md`'s repo structure and `05-AI-DRILL-BUILDER-PROMPT.md`'s "Save to library" for the exact layout. Easy for a non-technical committee member to add a new one later by copying an existing session's folder.
- Diagrams: each drill's diagram is authored as structured JSON (not an image), one file per drill at `/content/sessions/session-XX-slug/diagrams/drill-N.json`, rendered client-side by the shared `renderCourtDiagram` component — see `06-SVG-DIAGRAM-SYSTEM.md` for the full system. (Earlier drafts of this content pipeline used AI-generated diagram images; that approach was replaced — there is no image-generation step anywhere in this flow.)

### 3. Gallery (`/gallery/`)
- Single embedded Google Drive folder view (iframe), full-width, responsive.
- Short instructions above the embed for members on how to add their own photos (i.e. a shared upload link/folder, if the committee wants member contributions).
- **Embed pattern:**
  ```html
  <iframe
    src="https://drive.google.com/embeddedfolderview?id=FOLDER_ID#grid"
    style="width:100%; height:80vh; border:0;">
  </iframe>
  ```
  Requires the target Drive folder to be shared as "Anyone with the link can view."

### 4. AI Drill Builder (`/drill-builder/`)
- Simple form: number of confirmed players, number of courts booked, theme (dropdown of the standard skill themes, or "surprise me"), session length (default 2 hours), any notes (e.g. low turnout, two beginners joining this week). Linked from a homepage feature tile and a persistent footer link (see Home, above) — it has no entry in the main nav bar to keep that list at 4 items for mobile.
- Submit → calls the Cloudflare Worker endpoint → Worker calls an LLM via OpenRouter using the system prompt in `05-AI-DRILL-BUILDER-PROMPT.md` → returns a formatted session plan.
- Render the result in the same visual template as the static session plans (reuse the component), with a "copy"/"download as text" button plus a separate "Save this session plan" button that packages a good generation into the Drills & Sessions library's file format for a committee member to commit — see "Save to library" in `05-AI-DRILL-BUILDER-PROMPT.md`.
- No login required for v1; rate limit in the Worker by IP (30/hour — see `03-TECHNICAL-ARCHITECTURE.md`) to prevent abuse/cost overrun, since each generation costs a small amount of API credit.

### 5. About / Join (`/about/`)
- Club description, who it's for, session times/location, how to express interest in joining via a `mailto:info@rightcourtsc.com` link (placeholder address — swap for the club's real contact email before launch, same pattern as the Gallery's placeholder Drive `FOLDER_ID`). No need for a full backend form handler in v1; a simple Cloudflare Worker + email service like Resend can be added later if wanted.

## Content maintenance model
Since this is GitHub Pages, content updates happen via git. Recommend:
- `/content/sessions/session-XX-slug/session.md` — one folder per session plan (matching its URL slug), using consistent front-matter (theme, date, tags) so the Drills & Sessions page can list/filter them automatically, plus a `diagrams/drill-N.json` per drill in the same folder.
- A short `CONTENTS-HOWTO.md` in the repo (Phase 3 deliverable) explaining, in plain language, how a non-technical committee member adds a new session plan folder and gets it live (even if that just means "ask [technical person] to copy this folder in and push").
