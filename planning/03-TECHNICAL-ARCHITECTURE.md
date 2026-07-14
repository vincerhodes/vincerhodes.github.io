# Right Court SC — Technical Architecture

## Overview
Two moving parts:
1. **Static site** — GitHub Pages, serving everything except the AI drill builder's generation step.
2. **AI Worker** — a single Cloudflare Worker acting as a thin, secure API endpoint that calls an LLM via OpenRouter on the site's behalf.

Everything else (gallery, session plan pages, nav, styling) is plain static HTML/CSS/JS (or a minimal static-site generator — see note below) with no server required.

## Why not put the whole site on Cloudflare Pages instead?
You could — Cloudflare Pages also hosts static sites for free and can run the Worker in the same project, which would arguably be *simpler* (one platform instead of two). The brief specifically asked for GitHub Pages, so that's what's specified here, with Cloudflare doing DNS/CDN and the one serverless function. If at any point during the build this feels like unnecessary complexity, switching the whole thing to Cloudflare Pages is a valid simplification — flagging this as an option, not insisting on the split.

## Domain & DNS
1. Register `rightcourtsc.com` — cheapest reputable options are Cloudflare Registrar (at-cost, no markup, ~$10–12/yr) or Namecheap (~$12–15/yr with promos). Cloudflare Registrar requires the domain already be on a Cloudflare account, which is convenient since Cloudflare is being used for DNS anyway.
2. Add the domain to a (free) Cloudflare account for DNS management.
3. Point the apex domain and `www` at GitHub Pages per GitHub's custom domain instructions (A records to GitHub's IPs, or `ALIAS`/`CNAME` flattening for the apex — Cloudflare supports CNAME flattening on the root domain, which is the cleanest option).
4. Add a `CNAME` file to the GitHub Pages repo root containing `rightcourtsc.com` so GitHub knows to serve the custom domain.
5. Enforce HTTPS (GitHub Pages provisions a free cert automatically once the custom domain is verified; Cloudflare should be set to "DNS only" — not proxied — for the GitHub Pages records, or "Full" SSL mode if proxied, to avoid redirect loops).
6. Point a subdomain, `api.rightcourtsc.com`, at the Cloudflare Worker (this is a Cloudflare-native route, straightforward since DNS already lives there).

## GitHub repo structure (decided: root user/org site)
Repo name is fixed to `<your-github-username>.github.io` — this exact name is required for GitHub's root-site pattern (serves from the account root with zero Pages config, vs. a named repo needing custom-domain settings). Replace `<your-github-username>` with the real account before Phase 1.
```
<your-github-username>.github.io
├── index.html
├── about/
├── gallery/
├── drills/
│   └── session-01-straight-length-and-the-t/
├── drill-builder/
├── content/
│   └── sessions/
│       └── session-01-straight-length-and-the-t/   # one folder per session, matches its URL slug
│           ├── session.md
│           └── diagrams/
│               └── drill-1.json                    # one file per drill, see 06-SVG-DIAGRAM-SYSTEM.md
├── assets/
│   ├── logos/
│   ├── css/
│   └── js/
│       └── court-diagram.js    # static SVG court template + renderCourtDiagram(), see 06-SVG-DIAGRAM-SYSTEM.md
├── CNAME
└── README.md
```
If the session-plan library grows past ~15–20 entries, consider introducing a minimal static site generator (11ty is a good fit — lightweight, outputs plain HTML, no framework lock-in) so Markdown → page rendering is automatic rather than hand-built per page. Not necessary for v1.

## AI Drill Builder — Worker architecture
```
Browser (drill-builder page)
   │  POST { players, courts, theme, duration_minutes, notes }
   ▼
Cloudflare Worker (api.rightcourtsc.com/generate)
   │  - validates input
   │  - rate-limits by IP via a Cloudflare KV counter (decided — see Rate limiting below)
   │  - POSTs to https://openrouter.ai/api/v1/chat/completions with system prompt
   │    from 05-AI-DRILL-BUILDER-PROMPT.md, model: "anthropic/claude-haiku-4.5:exacto",
   │    forcing tool-use (tool_choice: {type:"function", function:{name:"return_session_plan"}})
   │    so the response is schema-validated JSON, not free text to be parsed
   │  - OpenRouter API key stored as a Worker Secret (never exposed to the browser)
   ▼
OpenRouter → routed to the pinned model (see 05-AI-DRILL-BUILDER-PROMPT.md for model choice)
   │  returns { plan_markdown, drills[] } via the forced tool call
   ▼
Worker clamps drills[].diagram coordinates defensively, returns JSON to browser
   → rendered in the session-plan template
```

**Error contract:** on any total failure (OpenRouter timeout, non-2xx response, or a response that doesn't
include the forced tool call) the Worker returns a non-2xx status with `{"error": "<short message>"}`;
the frontend shows a plain "Couldn't generate a plan — try again" message with a retry button. This is
distinct from the partial-diagram-failure case above, which never surfaces an error to the user.

**Security notes:**
- The OpenRouter API key must live only in the Worker's environment (`wrangler secret put OPENROUTER_API_KEY`), never in any client-side JS or committed to the repo.
- CORS on the Worker should be restricted to `https://rightcourtsc.com` and `https://<your-github-username>.github.io` (the root-site Pages URL used during development before the custom domain is cut over — see repo structure above).
- **Rate limiting (decided):** a Cloudflare KV counter, not Cloudflare's built-in rate limiting rules — KV stays inside the free tier at this traffic volume with a straightforward implementation (increment a per-IP key with a 1-hour TTL), whereas the built-in rules product has its own plan-dependent limits and would be one more thing to configure outside the Worker's own code. Cap: 30 generations per IP per hour. Set higher than the "abuse guard" instinct
  suggests: members will often hit this from the same clubhouse/car-park wifi NAT'd to one shared IP
  (see `00-PROJECT-BRIEF.md` — "phone in the car park before a session" is the primary use case), and
  real cost risk at this pricing tier stays negligible well past this level. A tight per-IP cap would mean
  one eager member locks out everyone else on the same connection for the hour.
- Log nothing sensitive; a simple request count in Cloudflare KV is enough for cost monitoring.

## wrangler.toml (starting sketch)
```toml
name = "rightcourtsc-drill-builder"
main = "src/worker.js"
compatibility_date = "2026-07-01"

routes = [
  { pattern = "api.rightcourtsc.com/*", custom_domain = true }
]

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<create with: wrangler kv namespace create RATE_LIMIT>"
```
Secrets (not in this file): set via `wrangler secret put OPENROUTER_API_KEY`.

## Cost summary
| Item | Cost |
|---|---|
| Domain (rightcourtsc.com) | ~$10–12/yr |
| GitHub Pages hosting | Free |
| Cloudflare DNS/CDN | Free |
| Cloudflare Worker | Free tier (100,000 requests/day — will never be approached at club scale) |
| LLM usage (via OpenRouter) | Usage-based; `anthropic/claude-haiku-4.5:exacto` runs ≈$0.60/month at realistic club usage (10–30 generations/month, ~700 input + ~3,000 output tokens each) — see `05-AI-DRILL-BUILDER-PROMPT.md` for model options and current pricing links |

## Local development
- Static site: any local server (`npx serve`, or just open the HTML files) — no build step required for plain HTML/CSS/JS.
- Worker: Cloudflare's `wrangler dev` for local testing of the AI endpoint before deploying. Use an OpenRouter test key with a low spend cap while iterating.
