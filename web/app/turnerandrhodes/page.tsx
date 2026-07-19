// Port of the T&R source site's index.html. Content verbatim; internal links switched
// to clean trailing-slash URLs; scripts (main.js, counters.js) ported to the layout's
// TrEffects and the TrCounters client component.
import type { Metadata } from "next";
import Link from "next/link";
import TrCounters from "@/components/tr/TrCounters";
import TrSpotlight from "@/components/tr/TrSpotlight";

export const metadata: Metadata = {
  title: "Turner & Rhodes Solicitors | Sports & Personal Injury Specialists, London",
  description:
    "Turner & Rhodes Solicitors — City of London specialists in sports injury, squash and racquetball court claims, and personal liability matters, handled with discretion.",
};

export default function TurnerRhodesHome() {
  return (
    <main id="main">
      <section className="hero">
        <div className="hero__bg" data-parallax="0.12"></div>
        <svg
          className="hero__scales"
          data-parallax="0.06"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          aria-hidden="true"
        >
          <line x1="50" y1="8" x2="50" y2="88" />
          <circle cx="50" cy="8" r="2.5" fill="currentColor" />
          <line x1="18" y1="24" x2="82" y2="24" />
          <path d="M18 24 L8 46 A10 10 0 0 0 28 46 Z" />
          <path d="M82 24 L72 46 A10 10 0 0 0 92 46 Z" />
          <line x1="34" y1="92" x2="66" y2="92" />
          <line x1="50" y1="88" x2="50" y2="92" />
        </svg>
        <div className="container hero__content">
          <span className="eyebrow">Est. 2009 &middot; City of London</span>
          <h1 className="hero__title reveal">
            Judgment. Discretion.
            <br />
            Results.
          </h1>
          <p className="hero__subtitle reveal" style={{ transitionDelay: "80ms" }}>
            Turner &amp; Rhodes represent clients in sports injury and personal liability
            matters with the same gravity the law affords any dispute — including, uniquely
            among City firms, a dedicated squash and racquetball court injury practice.
          </p>
          <div className="hero__ctas reveal" style={{ transitionDelay: "160ms" }}>
            <Link className="btn btn--primary" href="/turnerandrhodes/contact/">
              Book a Consultation
            </Link>
            <Link className="btn btn--ghost" href="/turnerandrhodes/practice-areas/">
              View Practice Areas
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="stats reveal-stagger">
            <div className="stat reveal">
              <span className="stat__value" data-target="17" data-suffix="+">
                17+
              </span>
              <span className="stat__label">Years in Practice</span>
            </div>
            <div className="stat reveal">
              <span className="stat__value" data-target="1240" data-suffix="+">
                1,240+
              </span>
              <span className="stat__label">Claims Settled</span>
            </div>
            <div className="stat reveal">
              <span
                className="stat__value"
                data-target="8.4"
                data-prefix="&pound;"
                data-suffix="M+"
                data-decimals="1"
              >
                &pound;8.4M+
              </span>
              <span className="stat__label">Recovered for Clients</span>
            </div>
            <div className="stat reveal">
              <span className="stat__value" data-target="94" data-suffix="%">
                94%
              </span>
              <span className="stat__label">Success Rate</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              What We Handle
            </span>
            <h2 className="section-title">Practice Areas</h2>
            <p>
              From the squash court to the pavement outside it, we take every instruction as
              seriously as the last.
            </p>
          </div>
          <div className="practice-grid reveal-stagger">
            <article className="practice-card reveal">
              <svg
                className="practice-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
              </svg>
              <h3 className="practice-card__title">Sports Injury Claims</h3>
              <p>
                Representation for injuries sustained in organised sport, from amateur leagues
                to club championships.
              </p>
              <Link
                className="practice-card__link"
                href="/turnerandrhodes/practice-areas/#sports-injury"
              >
                Learn more &rarr;
              </Link>
            </article>
            <article className="practice-card reveal">
              <span className="practice-card__tag">Signature Specialty</span>
              <svg
                className="practice-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              <h3 className="practice-card__title">Squash &amp; Racquetball Court Claims</h3>
              <p>
                Believed to be the only dedicated court-injury practice among City solicitors
                — collisions, ricochets, and wall-strike claims.
              </p>
              <Link
                className="practice-card__link"
                href="/turnerandrhodes/practice-areas/#squash"
              >
                Learn more &rarr;
              </Link>
            </article>
            <article className="practice-card reveal">
              <svg
                className="practice-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              </svg>
              <h3 className="practice-card__title">Ocular &amp; Eye Trauma</h3>
              <p>
                Claims arising from ball-strike and racquet-sport eye injuries, where outcomes
                can affect long-term vision.
              </p>
              <Link
                className="practice-card__link"
                href="/turnerandrhodes/practice-areas/#ocular"
              >
                Learn more &rarr;
              </Link>
            </article>
            <article className="practice-card reveal">
              <svg
                className="practice-card__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M4 20 20 20" />
                <path d="M6 20 6 10 12 4 18 10 18 20" />
              </svg>
              <h3 className="practice-card__title">Slip, Trip &amp; Public Liability</h3>
              <p>
                Claims against premises, clubs, and venues for failing a reasonable duty of
                care to visitors and members.
              </p>
              <Link
                className="practice-card__link"
                href="/turnerandrhodes/practice-areas/#slip-trip"
              >
                Learn more &rarr;
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              Client Word
            </span>
            <h2 className="section-title">Instructed With Confidence</h2>
          </div>
          <div className="testimonials reveal-stagger">
            <div className="testimonial-card reveal">
              <p className="testimonial__quote">
                After my accident on Court 3, I didn&rsquo;t think anyone would take it
                seriously. Turner &amp; Rhodes did, from the first letter.
              </p>
              <p className="testimonial__author">D. Whitfield</p>
              <p className="testimonial__meta">Member, Barbican Squash Club</p>
            </div>
            <div className="testimonial-card reveal">
              <p className="testimonial__quote">
                Precise, unflappable, and entirely unbothered by how unusual my case sounded
                on paper.
              </p>
              <p className="testimonial__author">R. Adeyemi-Foster</p>
              <p className="testimonial__meta">Amateur League Player</p>
            </div>
            <div className="testimonial-card reveal">
              <p className="testimonial__quote">
                They settled in eleven weeks what I&rsquo;d been told would take a year.
                Quietly excellent.
              </p>
              <p className="testimonial__author">M. Okonkwo-Lyle</p>
              <p className="testimonial__meta">Private Client</p>
            </div>
          </div>
        </div>
      </section>

      <TrSpotlight />

      <section className="cta-banner">
        <div className="container">
          <div className="section__header">
            <h2 className="section-title reveal">
              Struck by a Stray Ball? Slipped on the Baseline?
            </h2>
            <p className="reveal" style={{ transitionDelay: "80ms" }}>
              We take it seriously, even when others don&rsquo;t. Arrange a confidential,
              no-obligation consultation with a member of our team.
            </p>
            <div className="reveal" style={{ transitionDelay: "160ms" }}>
              <Link className="btn btn--primary" href="/turnerandrhodes/contact/">
                Book a Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <TrCounters />
    </main>
  );
}
