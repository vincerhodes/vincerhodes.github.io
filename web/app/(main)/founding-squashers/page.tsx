// Port of the static site's founding-squashers/index.html. Content verbatim.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Founding Squashers — Right Court SC",
  description: "The founding members of Right Court SC, Est. 2024.",
};

export default function FoundingSquashersPage() {
  return (
    <>
      <section className="page-header">
        <h1>Founding Squashers</h1>
      </section>

      <main className="about-content">
        <p>
          Four names on the founding roll, Est. 2024 &mdash; the ones who looked at a perfectly good
          squash habit and decided it needed a crest, a website, and a committee WhatsApp group that
          never sleeps. History will be kind. We&rsquo;ve made sure of it &mdash; we wrote this page.
        </p>

        <div className="founders-grid">
          <div className="founder-card">
            <div className="founder-avatar" aria-hidden="true">JR</div>
            <h3>Jimmy &ldquo;The Boaster&rdquo; Rhodes</h3>
          </div>
          <div className="founder-card">
            <div className="founder-avatar" aria-hidden="true">JC</div>
            <h3>Joe &ldquo;Skid Boast&rdquo; Cash</h3>
          </div>
          <div className="founder-card">
            <div className="founder-avatar" aria-hidden="true">AT</div>
            <h3>Adam &ldquo;Soft Hands&rdquo; Turner</h3>
          </div>
          <div className="founder-card">
            <div className="founder-avatar" aria-hidden="true">JB</div>
            <h3>Jonny &ldquo;The Diplomat&rdquo; Brooks</h3>
          </div>
        </div>

        <p>
          Jimmy and Adam also moonlight as{" "}
          <a href="https://rightcourtsc.com/turnerandrhodes/">Turner &amp; Rhodes Solicitors</a>,
          Sports &amp; Personal Injury Specialists &mdash; handy, given how often the squash bites
          back.
        </p>

        <div className="partner-note">
          <div className="partner-note-label">Sponsored</div>
          <a href="https://rightcourtsc.com/turnerandrhodes/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/partners/turnerandrhodes-card.png"
              width="300"
              height="250"
              alt="Turner & Rhodes Solicitors — Sports & Personal Injury Specialists. No boast, no win, no fee."
            />
          </a>
        </div>
      </main>
    </>
  );
}
