// Port of the static site's drills/index.html — session grid + 9 theme filter buttons + the
// embedded "Generate a new session" builder section (Phase 3). The page-scoped <style> block
// lives in ./drills.css (imported here, so it only loads on this route); the inline filter
// <script> is ported to @/components/SessionGrid and the builder to @/components/DrillBuilder
// (shared with the standalone /drill-builder/ page).
import type { Metadata } from "next";
import DrillBuilder from "@/components/DrillBuilder";
import SessionGrid from "@/components/SessionGrid";
import { getAllSessions } from "@/lib/sessions";
import "./drills.css";

export const metadata: Metadata = {
  title: "Drills & Sessions — Right Court SC",
  description:
    "Browse Right Court SC's library of coached session plans, filterable by skill theme, complete with court diagrams.",
};

export default function DrillsPage() {
  const sessions = getAllSessions();

  return (
    <>
      <section className="page-header">
        <h1>Drills &amp; Sessions</h1>
      </section>

      <main>
        <p className="drills-intro">
          Every coached session, past and upcoming, Wednesdays and Saturdays — full drill
          breakdowns, conditioned games, and diagrams, so nobody has an excuse for standing in
          the wrong spot. Filter by theme if you know what you want to work on. If you
          don&apos;t, that&apos;s what Surprise Me is for.
        </p>

        <SessionGrid
          sessions={sessions.map((s) => ({
            slug: s.slug,
            number: s.number,
            shortTitle: s.shortTitle,
            cardMeta: s.cardMeta,
            filterThemes: s.filterThemes,
          }))}
        />

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

        <section className="builder-section">
          <div className="builder-section-header">
            <h2>Generate a new session</h2>
            <p>
              Nothing above hitting the spot? Tell it who&rsquo;s turning up tonight and
              it&rsquo;ll build a full session on the fly — diagrams, coaching points, the lot.
              Same coaching brain behind it as everything else in the library, just faster and
              slightly less judgmental.
            </p>
          </div>

          <div className="builder-content">
            <DrillBuilder />
          </div>
        </section>
      </main>
    </>
  );
}
