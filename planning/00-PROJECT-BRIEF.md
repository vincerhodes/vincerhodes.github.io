# Right Court SC — Website Project Brief

## What we're building
A small, fast, good-looking static website for Right Court SC (a recreational squash group/club), hosted on GitHub Pages under the custom domain **rightcourtsc.com**, plus one lightweight serverless feature: an AI-powered drill/session builder.

## Goals
- Give the club a real home online: who we are, how to join a session, a photo gallery, and a library of drills/session plans.
- Keep ongoing cost as close to zero as possible — this is a hobby club, not a business.
- Make it easy for a non-technical committee member to update content later (plain files, no CMS login to manage).
- The AI drill builder should let a member generate a themed session plan on demand, following the same coaching principles the club already uses (see `05-AI-DRILL-BUILDER-PROMPT.md`).
- Must be genuinely responsive — most members will look at this on a phone in the car park before a session, not on a desktop.

## Pages (v1)
1. **Home** — intro, logo, what the club is, next session info, CTA to gallery/drills.
2. **Gallery** — embedded Google Drive folder of session/event photos.
3. **Drills & Sessions** — library of session plans (starting with the ones already written), browsable by theme.
4. **AI Drill Builder** — form (player count, theme, duration) → generates a formatted session plan in the house style.
5. **About / Contact** — basic club info, how to join, contact method.

## Recommended stack
| Layer | Choice | Why |
|---|---|---|
| Static site hosting | GitHub Pages | Free, matches what was requested, trivial to update via git |
| Domain | rightcourtsc.com via Cloudflare Registrar (or Namecheap) | At-cost/cheap registrar (~$10–12/yr), easy DNS management |
| DNS | Cloudflare (free plan) | Free CDN + SSL + easy custom domain pointing at GitHub Pages |
| AI drill builder backend | Cloudflare Worker (free tier) | Only piece of the site needing server-side code (to hold the OpenRouter API key securely); everything else stays static |
| AI model | `anthropic/claude-haiku-4.5:exacto` via OpenRouter (see `05-AI-DRILL-BUILDER-PROMPT.md`) | OpenRouter gives model flexibility (swap providers via a one-line config change) at negligible markup; Exacto routing biases toward providers with reliable forced tool-calling, which this feature depends on end-to-end |
| Gallery | Public Google Drive folder, embedded via iframe | Zero build cost, club likely already has photos in Drive |
| Framework | Plain HTML/CSS/JS, or a minimal static site generator (e.g. 11ty) if the content library grows past ~15–20 session plans | Keep it simple; avoid heavy frameworks for a low-traffic club site |

## Estimated ongoing cost
- Domain: ~$10–12/year
- Hosting: $0 (GitHub Pages)
- DNS/CDN: $0 (Cloudflare free plan)
- AI Worker: $0 (well within free tier for club-scale traffic)
- LLM usage (via OpenRouter): usage-based, ≈$0.60/month at club scale (10–30 generations/month) with the default model — see `03-TECHNICAL-ARCHITECTURE.md` for the breakdown

**Total: roughly the price of the domain name, plus a small variable AI cost.**

## Build phases
See `04-BUILD-PHASES-FOR-CLAUDE-CODE.md` for the exact phase breakdown to hand to Claude Code. In short:
- **Phase 0 — Design first.** Before any implementation code is written, work with Claude on the visual design direction (layout, type, spacing, component look) using the brand assets in `01-BRAND-STYLE-GUIDE.md`, and get sign-off on that direction before scaffolding the real site.
- **Phase 1 — Static scaffold.** Home, About, and site shell/navigation, deployed to GitHub Pages.
- **Phase 2 — Gallery.** Google Drive embed.
- **Phase 3 — Drills & Sessions library.** Content structure + first session plan(s) published.
- **Phase 4 — AI Drill Builder.** Cloudflare Worker + OpenRouter integration, wired to a form on the site.
- **Phase 5 — Domain + polish.** Point rightcourtsc.com at the site, cross-device QA, performance pass.

## Files in this doc set
- `00-PROJECT-BRIEF.md` — this file
- `01-BRAND-STYLE-GUIDE.md` — colors (sampled from the actual logo files), logo usage, type direction
- `02-SITE-MAP-AND-CONTENT.md` — pages, navigation, content structure
- `03-TECHNICAL-ARCHITECTURE.md` — hosting, DNS, Worker setup, security notes
- `04-BUILD-PHASES-FOR-CLAUDE-CODE.md` — step-by-step build instructions
- `05-AI-DRILL-BUILDER-PROMPT.md` — the system prompt/rules for the AI drill builder feature
- `06-SVG-DIAGRAM-SYSTEM.md` — how drill diagrams are built as rendered SVG (not AI-generated images)
- `assets/logos/` — the four logo files provided, with usage notes

## A note on diagrams
Earlier drafts of the session plans used an AI image-generation tool (Nano Banana Pro) to produce drill diagrams. That approach didn't hold up on quality, so it's been replaced with a rendered-SVG system — see `06-SVG-DIAGRAM-SYSTEM.md`. This is a better technical fit anyway: court geometry is repetitive and precise, which suits deterministic vector rendering far better than image generation, and it comes with zero marginal cost and perfect brand consistency.
