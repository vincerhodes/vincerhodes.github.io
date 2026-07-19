// Port of the static site's repo-root index.html. Content verbatim; links switched to clean URLs.
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Right Court SC — Recreational Squash Club",
  description:
    "Right Court SC is a recreational squash club for intermediate-to-advanced players who want structured, coached sessions.",
};

export default function Home() {
  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="badge" src="/logos/logo.webp" alt="Right Court SC badge" />
        <h1>Right Court SC</h1>
        <p className="tagline">Recreational squash, played with intent.</p>
        <p className="est">Est. 2024</p>
      </section>

      <main>
        <p className="intro">
          Right Court SC is a recreational squash club for players who&rsquo;ve moved past flailing
          about and want some actual structure &mdash; coached sessions and proper plans, not just
          turning up and hoping. Come groove your length game, work out what the front court&rsquo;s
          actually for, or get shouted at kindly by someone who knows what they&rsquo;re talking
          about.
        </p>

        <div className="next-session">
          <h2>Session Times</h2>
          <p>Wednesdays 18:00&ndash;20:00 &amp; Saturdays 09:00&ndash;11:00 &mdash; Feeling Squash</p>
        </div>

        <div className="tiles">
          <Link className="tile" href="/drills/">
            <h3>Drills &amp; Sessions</h3>
            <p>Every session we&rsquo;ve ever run, diagrams included. No, you can&rsquo;t skip the warm-up.</p>
          </Link>
          <Link className="tile" href="/gallery/">
            <h3>Gallery</h3>
            <p>The evidence. Sessions, socials, and whatever happened after.</p>
          </Link>
          <Link className="tile" href="/drill-builder/">
            <h3>AI Drill Builder</h3>
            <p>A robot coach, on demand. Tell it who&rsquo;s turned up, it does the thinking.</p>
          </Link>
        </div>

        <div className="partner-note">
          <div className="partner-note-label">Sponsored</div>
          <a href="https://rightcourtsc.com/turnerandrhodes/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/partners/turnerandrhodes-wide.png"
              width="728"
              height="90"
              alt="Turner & Rhodes Solicitors — Sports & Personal Injury Specialists. No boast, no win, no fee."
            />
          </a>
        </div>
      </main>
    </>
  );
}
