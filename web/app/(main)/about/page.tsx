// Port of the static site's about/index.html. Content verbatim; links switched to clean URLs.
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About / Join — Right Court SC",
  description: "Who Right Court SC is for, when and where we play, and how to join.",
};

export default function AboutPage() {
  return (
    <>
      <section className="page-header">
        <h1>About / Join</h1>
      </section>

      <main className="about-content">
        <p>
          We&rsquo;re a recreational squash club that got tired of &ldquo;just hit for an
          hour&rdquo; and decided coaching should actually go somewhere. Every session has one job
          &mdash; length one week, volleys the next, then boasts, movement, deception, serves,
          whatever&rsquo;s on the board. No open hitting, no wandering. You&rsquo;ll know exactly
          why you&rsquo;re sore afterwards.
        </p>

        <p>
          Curious who&rsquo;s actually to blame for all this? Meet the{" "}
          <Link href="/founding-squashers/">Founding Squashers</Link>.
        </p>

        <h2>Who it&rsquo;s for</h2>
        <p>
          You&rsquo;ve got a racket, you&rsquo;ve got a rally in you, and you know which wall to aim
          at &mdash; that&rsquo;s the bar. This isn&rsquo;t a beginners&rsquo; clinic. If you can
          already keep the ball going and just want it going better, you&rsquo;re exactly who we
          built this for.
        </p>

        <h2>When &amp; where</h2>
        <p>
          Wednesdays 18:00&ndash;20:00 and Saturdays 09:00&ndash;11:00, at Feeling Squash. Yes,
          that&rsquo;s genuinely the venue&rsquo;s name &mdash; we didn&rsquo;t pick it, we just
          enjoy saying it. Session plans go up in advance on the{" "}
          <Link href="/drills/">Drills &amp; Sessions</Link> page, so you know what you&rsquo;re
          walking into.
        </p>

        <h2>Dress code</h2>
        <p>
          We lean classy &mdash; crisp all-white, old-school squash tradition. But we&rsquo;re not
          sticklers. Wear what you like, with one hard rule: no exceptionally short shorts. To be
          crystal clear, that means shorts so brief they leave nothing to the imagination and risk
          &lsquo;popping out&rsquo; mid-rally. Everything else? Fair game.
        </p>

        <div className="join-cta">
          <h2>Interested in joining?</h2>
          <p>
            Drop us a line. We&rsquo;ll sort you a spot, tell you what to bring, and try not to
            overwhelm you with squash puns on the first email. No promises.
          </p>
          <a href="mailto:info@rightcourtsc.com">info@rightcourtsc.com</a>
        </div>
      </main>
    </>
  );
}
