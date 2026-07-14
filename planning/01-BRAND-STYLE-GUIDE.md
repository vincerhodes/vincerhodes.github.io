# Right Court SC — Brand Style Guide

## Logo assets (in `assets/logos/`)
These are the actual provided files (moved here from a `planning/images/` staging folder) — each has a `.png` (source quality) and a `.webp` (web-optimized, ~15-20x smaller; **use the `.webp` versions in the built site**, keep `.png` as source). All four depict the same mark: a circular badge, "RIGHT COURT SC" arced around a Chinese moon-gate/pavilion motif with two crossed squash rackets underneath, "EST. 2026" beneath the motif.

| File | Description | Use for |
|---|---|---|
| `logo.png` / `logo.webp` | Full badge, green-filled ring with white line-art/text | **Standard logo — default choice for most placements**, including on white backgrounds |
| `logo_green_on_white.png` / `.webp` | Line-art only (no fill), thin green strokes on white/transparent | Lighter-weight alternative for white backgrounds where the filled badge feels too heavy (e.g. dense text contexts); `logo.png` is preferred by default |
| `logo_white_on_green.png` / `.webp` | Same badge, green-filled with white line-art/text | For placement directly on green-colored page sections (hero backgrounds). Not the footer — the footer uses the monogram (see `monogram.png` row below), per `02-SITE-MAP-AND-CONTENT.md` and the `STATIC.nav-footer-structure` check. |
| `monogram.png` / `.webp` | "RC" embroidery-style monogram with two ball icons | Favicon, small UI elements (mobile nav, social avatar) — anywhere the full badge would be too small to read |

The moon-gate/crossed-rackets motif is worth carrying through into small UI touches (e.g. a simplified gate motif as a section divider or loading icon), but don't overuse it.

## Color palette
Colors below were pixel-sampled directly from the actual logo files in `assets/logos/` (via PIL, dominant-color extraction) — not estimated. **The real files use two distinct greens**, not one:

| Name | Hex | Sampled from | Use |
|---|---|---|---|
| **Forest Green** (primary, recommended for CSS/UI) | `#21472E` | `logo_white_on_green.png` fill | Primary brand color — nav bar, buttons, headings, footer. Recommended as the canonical site green because this file is the one purpose-built for direct placement on a green surface, which is exactly the nav-bar/button use case. |
| **Badge Green** (logo-specific, do not use elsewhere) | `#2B5436` | `logo.png` fill | This is the standard logo file's own fill color — a distinctly different, slightly lighter green than Forest Green above. Use the logo file as-is; don't try to recolor it to match Forest Green. Don't introduce this second green anywhere else in the UI — treat it as logo-only. |
| **Deep Green** (line-art ink) | `#243B2B` | `logo_green_on_white.png` strokes | Fine line work / text on white if more contrast than Forest Green is needed |
| **White** | `#FFFFFF` | Logo background + reversed text on the solid badge | Base page background; text/logo on dark green backgrounds (the real files use plain white for this, not a warm ivory — see below) |
| **Near-black green** (for body text) | `#152218` | Derived (darker than primary) | Body copy on white — full brand green can feel heavy at body-text size; this darker near-black variant reads better for long text |

**Correction:** an earlier draft of this doc claimed a warm "Ivory" (`#EBEBDC`) sampled from "reversed text on solid badge." Direct pixel sampling of the real files shows that text is plain white (`#FFFFFF`), not ivory — that claim didn't hold up and has been removed. If a warm off-white is still wanted for section backgrounds (instead of stark white), it would need to be a fresh design decision, not a sampled brand color.

### Suggested functional extensions (not sampled, standard practice — flag as assumption)
- **Muted sage** `#8FA893` — light tint of the primary green, for subtle backgrounds, disabled states, hover fills. Derive by mixing Forest Green (`#21472E`) with white (~50% white per channel).
- **Warning/accent:** decided for v1 — no new hue. Form validation (Drill Builder form, any future contact form) uses text/icon cues only (e.g. a border + inline message in the near-black body-text color, plus an icon), not a color change. Revisit only if a real need for a status color comes up post-launch.

## Typography direction
The logo lettering is a classic serif with wide letter-spacing (a stamped/collegiate crest feel). Recommend:
- **Headings:** a classic serif (e.g. Source Serif 4, Lora, or Playfair Display for larger display headings) to echo the crest lettering, with generous letter-spacing on all-caps labels (mirroring "RIGHT COURT SC" and "EST. 2026" in the logo).
- **Body text:** a clean, highly legible sans-serif (e.g. Inter, or system font stack) for readability on mobile — don't set body copy in the serif.
- **Both should be free/open-source (Google Fonts or similar)** to keep cost at zero and avoid licensing complexity.

## Visual tone
Traditional/heritage club feel (crest logo, "EST." date, forest green) rather than a modern sporty/neon look. Lean into:
- Generous white space, restrained color use (green + white, not a rainbow of accent colors — no ivory in the current palette, see the Color Palette section's correction above)
- Subtle, not flashy, motion (fades/slides, not bouncy animations)
- The crossed-rackets/moon-gate motif can recur subtly as a divider or watermark, not as decoration on every page

## Logo usage rules
- Maintain clear space around the badge equal to roughly the height of the "R" in "RIGHT" on all sides.
- Never stretch, recolor outside the palette above, or add drop shadows to the crest.
- On green backgrounds, use `logo_white_on_green.png`/`.webp`, not the line-art version (which assumes a light background).
- Use the monogram (`monogram.png`/`.webp`) for the favicon and anywhere the full crest would be too small to read (browser tab, mobile nav bar, social avatar) — this is the **sole** favicon source; no other file should be used for that purpose.
