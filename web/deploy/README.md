# Deploying rightcourtsc.com to a VPS

Phase 6–7 runbook for `planning/07-VPS-MIGRATION.md`. Assumes a fresh Ubuntu 24.04 box
(Hetzner CX22-class or better — needs ~2GB free RAM for `next build`).

## 1. Create the box

Any provider. Requirements: Ubuntu 24.04, 2 vCPU / 4GB RAM is comfortable, a public IPv4
(and IPv6 if you want AAAA). Note its IP.

## 2. DNS — what WILL change (don't touch anything yet)

The apex A record can't point at both GitHub Pages and the VPS, so the DNS move IS the cutover
(step 6) — leave everything as-is for now. What exists today (see `dns/rightcourtsc.com.zone`,
though the registrar dashboard is the source of truth):

- apex: 4× A `185.199.108–111.153` + 4× AAAA (GitHub Pages)
- `www`: CNAME → `vincerhodes.github.io`
- `api.rightcourtsc.com`: NOT in this zone file — it's managed wherever the Worker route lives
  (likely Cloudflare). Leave it until step 6.

One useful pre-cutover action: if your registrar lets you, lower the TTL on the apex records to
300s a day before cutover so the switch propagates fast.

Caddy can only issue a TLS cert once DNS points at the box, so pre-cutover testing happens over
plain HTTP against the app directly (step 5).

## 3. Provision (once, on the box)

```sh
scp -r web/deploy root@<box-ip>:/tmp/deploy
ssh root@<box-ip> bash /tmp/deploy/provision.sh
```

Then edit `/etc/rightcourtsc/env` on the box with real values (see `../ENV.md`):

- `OPENROUTER_API_KEY` — same key as the Worker's (repo-root `.env`)
- `GOOGLE_DRIVE_API_KEY`, `GALLERY_FOLDER_ID` — currently Cloudflare Worker secrets
  (Cloudflare dashboard → Workers → rightcourtsc-api → Settings → Variables)
- `DATABASE_PATH=/var/lib/rightcourtsc/drills.db` (already set by the template)

## 4. Deploy (from your dev machine, repo root)

```sh
WEB_DEPLOY_HOST=root@<box-ip> bash web/deploy/deploy.sh
```

Re-run the same command for every subsequent deploy.

## 5. Smoke tests (on the box, before DNS cutover)

All run on the box against the app directly (no TLS yet — see step 2):

```sh
# App up?
systemctl status rightcourtsc --no-pager
curl -sI http://127.0.0.1:3000/ | head -1                     # 200
curl -sI http://127.0.0.1:3000/turnerandrhodes/ | head -1     # 200
curl -sI http://127.0.0.1:3000/drills/session-01-straight-length-and-the-t/ | head -1

# THE critical one — live generation (could not be verified from the dev machine,
# OpenRouter region-blocks it). Expect a JSON body with plan_markdown + drills:
curl -s -X POST http://127.0.0.1:3000/api/generate/ \
  -H 'Content-Type: application/json' \
  -d '{"players":2,"courts":1,"theme":"boasts","level":"improver","duration_minutes":60}'

# Gallery (needs the Drive secrets):
curl -s http://127.0.0.1:3000/api/gallery/ | head -c 200

# Saved drills round-trip:
TOK=smoke-$(date +%s)
curl -s -X POST http://127.0.0.1:3000/api/drills/ \
  -H "Content-Type: application/json" -H "X-Visitor-Token: $TOK" \
  -d '{"title":"smoke","payload":{"plan_markdown":"x","drills":[]}}'
curl -s http://127.0.0.1:3000/api/drills/ -H "X-Visitor-Token: $TOK"
```

For a browser click-through before cutover, SSH port-forward: `ssh -L 3000:127.0.0.1:3000
root@<box-ip>` then browse `http://localhost:3000/` — home, drills grid filters, drill-builder
end-to-end generation + save, /saved-drills/, /turnerandrhodes/ calculator + theme toggle.

## 6. Cutover (Phase 7 — do only after step 5 is fully green)

1. DNS at the registrar: replace the apex A records with the box IP (and AAAA if the box has
   IPv6). Change `www` from the CNAME to an A record → box IP. Within a minute or two of the
   records resolving, Caddy issues certificates automatically — check `journalctl -u caddy -f`
   if it stalls.
2. Verify HTTPS: `curl -sI https://rightcourtsc.com/ | head -1` → 200; re-run the step-5 smoke
   tests against `https://rightcourtsc.com/...`; browser click-through again.
3. Legacy URL check: `curl -sI https://rightcourtsc.com/drills/index.html` → 308 → `/drills/`,
   same for `/turnerandrhodes/practice-areas.html` etc.
4. Only after HTTPS is green: delete the `api.rightcourtsc.com` record (wherever it's managed),
   delete the Worker + its secrets in Cloudflare, delete `CNAME`/`.nojekyll`/`worker/` from the
   repo root, and disable GitHub Pages in repo settings.
5. Update `planning/HANDOFF.md` (repo map: worker gone, new stack) and root `package.json`
   description; check `CONTENTS-HOWTO.md` still matches reality.

## Rollback

If anything's wrong after cutover: point the apex A record back at the GitHub Pages IPs — the
old static site is untouched in git history and Pages re-serves it as-is.
