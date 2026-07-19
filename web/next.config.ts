import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json (static-site dev tooling); pin Turbopack's root
  // to web/ so it doesn't pick the parent lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Match the static site's directory-style URLs (/about/, /gallery/…) — the plan's clean-URL
  // scheme keeps trailing slashes, so make them canonical here instead of Next's default
  // slash-stripping redirect.
  trailingSlash: true,
  // Legacy GitHub Pages URLs → clean trailing-slash URLs (planning/07-VPS-MIGRATION.md Phase 2).
  // /drill-builder/ itself is Phase 3; its redirect is harmless until the route exists.
  async redirects() {
    const sessions = [
      "session-01-straight-length-and-the-t",
      "session-02-volley-pressure",
      "session-03-drop-and-die",
      "session-04-boast-and-drive",
      "session-05-front-court-touch",
      "session-06-disguise-and-deceive",
      "session-07-serve-and-return",
      "session-08-exhibition-flair",
    ];
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about/index.html", destination: "/about/", permanent: true },
      { source: "/gallery/index.html", destination: "/gallery/", permanent: true },
      {
        source: "/founding-squashers/index.html",
        destination: "/founding-squashers/",
        permanent: true,
      },
      { source: "/drills/index.html", destination: "/drills/", permanent: true },
      {
        source: "/drill-builder/index.html",
        destination: "/drill-builder/",
        permanent: true,
      },
      { source: "/loader-demo/index.html", destination: "/loader-demo/", permanent: true },
      // Turner & Rhodes (Phase 5) — legacy GitHub Pages .html URLs.
      { source: "/turnerandrhodes/index.html", destination: "/turnerandrhodes/", permanent: true },
      { source: "/turnerandrhodes/about.html", destination: "/turnerandrhodes/about/", permanent: true },
      {
        source: "/turnerandrhodes/practice-areas.html",
        destination: "/turnerandrhodes/practice-areas/",
        permanent: true,
      },
      { source: "/turnerandrhodes/team.html", destination: "/turnerandrhodes/team/", permanent: true },
      {
        source: "/turnerandrhodes/contact.html",
        destination: "/turnerandrhodes/contact/",
        permanent: true,
      },
      ...sessions.map((slug) => ({
        source: `/drills/${slug}/index.html`,
        destination: `/drills/${slug}/`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
