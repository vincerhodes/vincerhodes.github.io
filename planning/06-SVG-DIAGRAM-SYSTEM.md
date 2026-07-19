# Right Court SC — SVG Diagram System

Replaces the earlier Nano Banana Pro image-generation approach. Diagrams are rendered as SVG from structured data, not generated as images — this is more reliable, on-brand, lightweight, and genuinely responsive than an AI image model for this specific job (repetitive court geometry + a few variable elements).

## Architecture
```
Static SVG court template (hand-built once, never regenerated)
        +
Per-drill JSON data (player positions, arrows, labels)
        +
JS renderer (plots the JSON onto the template)
        =
Crisp, on-brand, tiny vector diagram
```

## 1. Static court template
Build one reusable SVG partial representing a squash court from directly overhead, using a normalized coordinate system so it scales cleanly at any size:
- `viewBox="0 0 100 150"` (arbitrary units, ratio matches a real court's ~6.4m × 9.75m proportions)
- Elements: outer court boundary, short line, half-court line, both service boxes, and the front wall — drawn as a distinct heavier stroke (e.g. 3x the other lines' stroke-width) along the top edge (`y=0`) of the court boundary, labeled "FRONT WALL" in small caps just outside that edge, in the same near-black-green (`#152218`) used for body text.
- Style: brand colors from `01-BRAND-STYLE-GUIDE.md` — Forest Green (`#21472E`) court lines on a white background, no photorealism, no texture. (An earlier draft of this doc suggested an "Ivory" background tint — that color's provenance didn't hold up under verification, see `01-BRAND-STYLE-GUIDE.md`'s color palette section, so stick with plain white until/unless a real off-white is defined.)
- This template is authored once (by Claude Code, by hand, doesn't need AI generation per-drill) and reused for every diagram on the site, stored as a JS-generated fragment in `assets/js/court-diagram.js` (see `03-TECHNICAL-ARCHITECTURE.md`'s repo structure) — a template string or DOM-building function, not a separate `.svg` file, since this is a plain HTML/CSS/JS v1 with no server-side include mechanism to pull in a partial.

## 2. Per-drill data schema
Each drill's diagram is described as JSON, using coordinates normalized 0–1 relative to the court's width and length (so they map directly onto the template's viewBox regardless of final render size):

```json
{
  "title": "Drill 1: Straight Rail Drives",
  "players": [
    { "id": "A", "label": "Player A", "color": "#21472E", "x": 0.3, "y": 0.62 },
    { "id": "B", "label": "Player B", "color": "#8FA893", "x": 0.3, "y": 0.88 }
  ],
  "arrows": [
    { "number": 1, "type": "ball", "points": [[0.3, 0.62], [0.18, 0.08]] },
    { "number": 2, "type": "ball", "points": [[0.18, 0.08], [0.3, 0.88]] },
    { "number": 3, "type": "movement", "points": [[0.3, 0.62], [0.3, 0.5]] }
  ]
}
```
- `type: "ball"` → shot path (solid line, arrowhead)
- `type: "movement"` → player footwork/recovery (dashed line, arrowhead) — note there's no separate `style` field; solid-vs-dashed is derived entirely from `type`, so the two can never mismatch
- `number` → sequence label rendered near the arrow's midpoint, so the pattern can be followed step by step
- `x`/`y` → `0,0` is the front-wall/left corner, `1,1` is the back-wall/right corner (define this convention once and keep it consistent everywhere)
- `color` (on `players`) → must be one of the three brand player-marker colors defined in `05-AI-DRILL-BUILDER-PROMPT.md`'s schema (`#21472E`, `#8FA893`, `#152218`)

## 3. Renderer
A single JS function, e.g. `renderCourtDiagram(containerEl, data)`:
- Clones the static court template into the container.
- For each entry in `players`: draws a labelled circle marker at `(x * courtWidth, y * courtLength)`.
- For each entry in `arrows`: draws a `<path>` through the given points **as straight line segments, in array order** (point 1 → point 2 → point 3 → ...) — no curve-fitting or smoothing, even when `points` has more than 2 entries. Adds an SVG `marker-end` arrowhead on the final segment, `stroke-dasharray` if `type: "movement"`, and a small numbered circle at the arrow's overall midpoint (the midpoint of the middle segment, or the single segment's midpoint for a 2-point arrow).
- Renders `title` as a caption above or below the diagram.
- Pure SVG/JS, no external dependencies required — keeps the static site lightweight.

## 4. Two ways diagrams get created

**A. Static session-plan library (Drills & Sessions pages)**
When a new session plan is written (by the coach, or by Claude in a planning conversation), the diagram JSON for each drill is authored alongside the plan and saved as `/web/content/sessions/session-XX-slug/diagrams/drill-N.json`, next to that session's `session.md` (see `03-TECHNICAL-ARCHITECTURE.md`'s repo structure for the canonical layout). The page template loads these and renders them via the shared component. This replaces the old workflow of pasting Nano Banana prompts into an external tool — the diagram is just part of the content file now.

**B. AI Drill Builder (dynamic generations)**
Extend the Worker's OpenRouter call (see `05-AI-DRILL-BUILDER-PROMPT.md`) so the model returns the diagram data for each drill *in the same response* as the plan text — no separate image-generation call, no added cost, no added latency beyond the one request. Diagram data comes back as a structured field (`drills[].diagram`) on a forced tool-use response, not parsed out of the plan text — see "Structured output via forced tool-use" in `05-AI-DRILL-BUILDER-PROMPT.md` for why prose-embedded JSON was dropped in favor of this. The drill-builder results page matches each `drills[].diagram` entry back to its drill in `plan_markdown` by `drill_name` and renders it instantly client-side using the same component from (A).

## 5. Validation (do this in Phase 4, not skip it)
The tool-use schema in `05-AI-DRILL-BUILDER-PROMPT.md` already enforces the structural constraints
(non-empty `players`/`arrows`, in-range `x`/`y`) at the API layer, so most of the old "malformed JSON"
failure class no longer applies. Two checks still belong in the Worker/client as defense in depth,
since schema constraints don't guarantee a *sensible* result:
- Clamp all `x`/`y` values to `[0, 1]` regardless (a model can still return in-range-but-off values;
  clamping is cheap insurance against a future schema change or client bug).
- Confirm each `drills[].drill_name` actually matches a drill heading in `plan_markdown`.
- Optional light heuristic: warn (in dev/testing, not to the user) if two players share near-identical coordinates, which usually indicates a confused pattern description.

**On failure:** degrade gracefully per drill — drop that one diagram and still render the drill's
text, rather than blocking the whole plan or firing an automatic retry call to the LLM. This keeps
cost/latency predictable and is cheap to accept given how rare a failure should now be. This is a
small amount of defensive code, not a major system — worth building once in Phase 4 and forgetting
about.

## Why this over image generation
- **Consistency:** every diagram uses your exact brand colors and line weights automatically — no per-generation quality variance.
- **Cost:** zero marginal cost per diagram (it's rendering, not generation); the AI Drill Builder case piggybacks on the text generation call already happening.
- **Performance:** vector output is a few KB, crisp at any zoom level (important for "wonderfully responsive" on a phone courtside), versus multi-hundred-KB raster images.
- **Editability:** a diagram that's slightly off can be hand-tweaked by editing a few numbers in a JSON file — much easier than re-prompting an image model and hoping.

## AI Drill Builder output format
This section previously described a fenced-JSON-block convention for how the model should emit diagram
data. That approach was replaced with forced tool-use — the model returns `drills[].diagram` as a
structured field on a single tool call, not JSON embedded in prose. See "Structured output via forced
tool-use" in `05-AI-DRILL-BUILDER-PROMPT.md` for the full schema and reasoning; section 4B above
describes how the Worker/client consume the result.
