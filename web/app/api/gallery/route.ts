// GET /api/gallery — port of the Cloudflare Worker's /gallery route (worker/src/index.js) to a
// Next.js route handler. Lists the public Google Drive gallery folder via the Drive API v3
// (helpers ported in web/lib/generate.ts) and shapes photos for the gallery client.
//
// Required env vars (Cloudflare Worker secrets today; move to the VPS systemd EnvironmentFile
// at cutover — see planning/07-VPS-MIGRATION.md Phase 6):
//   GOOGLE_DRIVE_API_KEY — API key restricted to the Drive API
//   GALLERY_FOLDER_ID    — the shared "anyone with the link can view" folder id
// Without them the route returns the same 502 the Worker returns. TEST_MODE === 'true' returns
// the Worker's stub photos instead. The Worker's edge cache becomes a 30-minute in-process cache
// (same TTL), keyed process-wide — one Node process serves all origins now, so the Worker's
// per-origin CORS cache key dance is unnecessary.
import { buildDriveListUrl, shapeGalleryPhotos, type GalleryPhoto } from "@/lib/generate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GALLERY_CACHE_TTL_MS = 1800 * 1000; // 30 min — Drive folder changes rarely, keep this snappy.
const GALLERY_MAX_FILES = 500; // pagination backstop, not a real-world cap for a club photo folder

// In-process cache on globalThis so Next.js dev-mode module reloading doesn't drop it.
const globalForCache = globalThis as unknown as {
  __rcGalleryCache?: { photos: GalleryPhoto[]; expiresAt: number };
};

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Test-mode stub, ported from worker/src/index.js — see stubGeneration there, same rationale. */
function stubGalleryPhotos(): GalleryPhoto[] {
  const colors = ["21472E", "8FA893", "152218", "3C6B4A"];
  return colors.map((hex, i) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">` +
      `<rect width="100%" height="100%" fill="%23${hex}"/>` +
      `<text x="50%" y="50%" fill="white" font-size="48" text-anchor="middle" dy=".3em">Stub ${i + 1}</text>` +
      `</svg>`;
    const dataUri = `data:image/svg+xml,${svg}`;
    return {
      id: `stub-${i}`,
      name: `Stub Photo ${i + 1}`,
      thumb: dataUri,
      full: dataUri,
      width: 800,
      height: 600,
    };
  });
}

/** Calls the Drive API (paginating as needed) and shapes the result. Throws on any failure. */
async function fetchGalleryPhotos(): Promise<GalleryPhoto[]> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GALLERY_FOLDER_ID;
  if (!apiKey || !folderId) {
    throw new Error("Gallery is not configured yet (missing GOOGLE_DRIVE_API_KEY or GALLERY_FOLDER_ID)");
  }

  let files: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const response = await fetch(buildDriveListUrl(folderId, apiKey, pageToken));
    if (!response.ok) {
      throw new Error(`Google Drive request failed (${response.status})`);
    }
    const data = await response.json();
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken;
  } while (pageToken && files.length < GALLERY_MAX_FILES);

  return shapeGalleryPhotos(files);
}

function photosResponse(photos: GalleryPhoto[]): Response {
  return Response.json(
    { photos },
    { headers: { "Cache-Control": `public, max-age=${GALLERY_CACHE_TTL_MS / 1000}` } }
  );
}

export async function GET(): Promise<Response> {
  if (process.env.TEST_MODE === "true") {
    return photosResponse(stubGalleryPhotos());
  }

  const cached = globalForCache.__rcGalleryCache;
  if (cached && Date.now() < cached.expiresAt) {
    return photosResponse(cached.photos);
  }

  let photos: GalleryPhoto[];
  try {
    photos = await fetchGalleryPhotos();
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Failed to load gallery", 502);
  }

  globalForCache.__rcGalleryCache = { photos, expiresAt: Date.now() + GALLERY_CACHE_TTL_MS };

  return photosResponse(photos);
}

export function POST(): Response {
  return errorResponse("Method not allowed", 405);
}
