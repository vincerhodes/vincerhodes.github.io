# Adding a new session plan

This explains how to add a new coached session to the Drills & Sessions library. No coding
knowledge is required for the content itself — you're copying a folder and editing text files.

## 1. Copy the folder

Duplicate the most recent session's folder inside `content/sessions/`, and rename your copy to
match your new session, e.g.:

```
content/sessions/session-02-your-session-title/
├── session.md
└── diagrams/
    ├── drill-1.json
    └── drill-2.json
```

Use the pattern `session-NN-a-short-url-slug` — lowercase, words separated by hyphens.

## 2. Edit `session.md`

Open `session.md` and replace the front-matter (the `---`-fenced block at the top) and the body
with your own session's details: theme, date, player/court count, duration, timeline, drill
details, games, court split, and coach's notes. Use the existing session as a template for the
sections and headings to keep — the page layout expects the same section order.

## 3. Edit the diagram files

Each drill that needs a court diagram gets its own `diagrams/drill-N.json` file. Copy an existing
one and adjust:
- `title` — the drill's name.
- `players` — one entry per player marker, with an `x`/`y` position from 0 to 1 (0,0 is the
  front-wall/left corner; 1,1 is the back-wall/right corner) and a `color` — it must be exactly
  one of `#21472E`, `#8FA893`, or `#152218` (the three brand player colors).
- `arrows` — one entry per shot or movement path. `type` must be `"ball"` (solid line, for shot
  paths) or `"movement"` (dashed line, for footwork/recovery). `points` is a list of `[x, y]`
  positions the arrow passes through, in order.

Run `node scripts/validate-diagrams.mjs` from the repo root to check your JSON is valid before
publishing — it will tell you exactly what's wrong if something doesn't fit the schema.

## 4. Build the page

Copy `drills/session-01-straight-length-and-the-t/index.html` to a new folder under `drills/`
matching your session's slug, and update the text to match your `session.md`. Near the bottom of
the file, update the two `renderCourtDiagram(...)` calls (add or remove calls to match your number
of drills) with the same data as your `diagrams/drill-N.json` files.

## 5. Add it to the library listing

Open `drills/index.html` and add a new card inside `<div class="session-grid">`, copying the
existing session's card. Set `data-themes` to a space-separated list of the skill themes your
session covers (matching the filter buttons above the grid, e.g. `data-themes="length movement"`)
and point the link at your new page.

## 6. Check it

Open `drills/index.html` in a browser and confirm your new card appears, filters correctly, and
the link opens your new session page with its diagrams rendering correctly.
