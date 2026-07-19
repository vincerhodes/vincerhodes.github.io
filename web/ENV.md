# Environment variables

For the Next.js app (planning/07-VPS-MIGRATION.md). Locally these come from the repo-root `.env`
via the `web/.env.local` symlink — do NOT commit either file. On the VPS they live in the systemd
`EnvironmentFile` (`/etc/rightcourtsc/env`, see the plan's Phase 6).

| Variable | Required by | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | `POST /api/generate` | OpenRouter key; model `anthropic/claude-haiku-4.5:exacto`, non-streaming. Already in repo-root `.env`. |
| `GOOGLE_DRIVE_API_KEY` | `GET /api/gallery` | Google Drive API v3 key restricted to the Drive API. Today a Cloudflare Worker secret — copy to the VPS EnvironmentFile at cutover. Without it the route returns 502 `Gallery is not configured yet (missing GOOGLE_DRIVE_API_KEY or GALLERY_FOLDER_ID)`. |
| `GALLERY_FOLDER_ID` | `GET /api/gallery` | The shared "anyone with the link can view" gallery folder id. Same provisioning story as the key above. |
| `DATABASE_PATH` | `web/lib/db.ts` | Optional. SQLite file location; default `./data/drills.db` relative to `web/` (gitignored). VPS: `/var/lib/rightcourtsc/drills.db`. |
| `TEST_MODE` | both API routes | Optional. When `"true"`, the routes return the Worker's stub responses instead of calling OpenRouter / Google Drive (rate limiting still applies). Dev/test only — never set in prod. |

No `.env.local.example` file exists because the tooling treats every `.env*` path as sensitive;
this document is the canonical reference instead.
