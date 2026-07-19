// Port of the T&R source site's practice-areas.html. Content verbatim; features.css is
// scoped as tr-features.css and imported here (the source loaded it on this page only);
// calculator.js and cases.js are ported to the TrCalculator and TrCases components.
import type { Metadata } from "next";
import Link from "next/link";
import TrCalculator from "@/components/tr/TrCalculator";
import TrCases from "@/components/tr/TrCases";
import "../tr-features.css";

export const metadata: Metadata = {
  title: "Practice Areas | Turner & Rhodes Solicitors",
  description:
    "Sports injury, squash and racquetball court claims, ocular trauma, and public liability practice areas at Turner & Rhodes Solicitors, London.",
};

export default function TurnerRhodesPracticeAreas() {
  return (
    <main id="main">
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">What We Handle</span>
          <h1 className="page-header__title">Where We Practise</h1>
          <p className="page-header__lede">
            Five areas of focused instruction — including the court-injury specialty few
            City firms will take on.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <article className="practice-detail reveal" id="sports-injury">
            <div>
              <svg
                className="practice-detail__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
              </svg>
              <h2>Sports Injury Claims</h2>
              <p>
                We represent amateur and semi-professional players injured during organised
                sport, where liability may rest with a club, governing body, opposing
                player, or equipment supplier. Instructions are prepared with the same
                rigour we&rsquo;d bring to any personal injury matter — medical evidence,
                witness accounts, and a clear liability narrative.
              </p>
            </div>
            <div className="practice-detail__examples">
              <h3>Typical Instructions</h3>
              <ul>
                <li>League or club fixture injuries</li>
                <li>Faulty or unsafe sporting equipment</li>
                <li>Negligent coaching or supervision</li>
                <li>Venue and facility safety failures</li>
              </ul>
            </div>
          </article>

          <article className="practice-detail reveal" id="squash">
            <div>
              <svg
                className="practice-detail__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              <h2>
                Squash &amp; Racquetball Court Claims{" "}
                <span className="practice-card__tag" style={{ marginLeft: "6px" }}>
                  Signature Specialty
                </span>
              </h2>
              <p>
                Believed to be the only dedicated court-injury practice among City
                solicitors. Squash and racquetball present a distinctive fact pattern —
                confined courts, high-velocity balls, and shared playing lines — that most
                generalist firms decline to take on. We don&rsquo;t.
              </p>
            </div>
            <div className="practice-detail__examples">
              <h3>Typical Instructions</h3>
              <ul>
                <li>Player-to-player racquet or ball collisions</li>
                <li>Court surface and tin defects</li>
                <li>Glass-back-wall impact injuries</li>
                <li>Inadequate court lighting or maintenance</li>
              </ul>
            </div>
            <div className="partner-note">
              <p>
                <strong>Local partner:</strong> proud solicitors to{" "}
                <a href="https://rightcourtsc.com/" target="_blank" rel="noopener">
                  Right Court SC
                </a>
                , a recreational squash club a short walk from the office. Book a session,
                work on your length game — and if the front wall gets the better of you, you
                know exactly where to find us.
              </p>
              <a
                className="btn btn--ghost"
                href="https://rightcourtsc.com/about/"
                target="_blank"
                rel="noopener"
              >
                Book a Session &rarr;
              </a>
            </div>
          </article>

          <article className="practice-detail reveal" id="ocular">
            <div>
              <svg
                className="practice-detail__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              </svg>
              <h2>Ocular &amp; Eye Trauma</h2>
              <p>
                Eye injuries from racquet sports carry a disproportionate risk of lasting
                impairment relative to their apparent severity at the time. Our ocular
                trauma unit, established in 2015, works closely with treating
                ophthalmologists to build claims that properly reflect long-term prognosis
                rather than initial presentation.
              </p>
            </div>
            <div className="practice-detail__examples">
              <h3>Typical Instructions</h3>
              <ul>
                <li>Ball-to-eye impact injuries</li>
                <li>Racquet-strike lacerations</li>
                <li>Claims involving protective eyewear failure</li>
                <li>Long-term visual impairment assessments</li>
              </ul>
            </div>
          </article>

          <article className="practice-detail reveal" id="slip-trip">
            <div>
              <svg
                className="practice-detail__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M4 20 20 20" />
                <path d="M6 20 6 10 12 4 18 10 18 20" />
              </svg>
              <h2>Slip, Trip &amp; Public Liability</h2>
              <p>
                Standard occupiers&rsquo;-liability instructions arising on the approach to,
                or within, sporting premises — changing rooms, car parks, and spectator
                areas included. These claims turn on whether the occupier met a reasonable
                standard of care, and we prepare the evidential record accordingly.
              </p>
            </div>
            <div className="practice-detail__examples">
              <h3>Typical Instructions</h3>
              <ul>
                <li>Wet or poorly maintained changing rooms</li>
                <li>Unmarked steps and uneven flooring</li>
                <li>Poor lighting in car parks and walkways</li>
                <li>Inadequate signage of known hazards</li>
              </ul>
            </div>
          </article>

          <article className="practice-detail reveal" id="clubs">
            <div>
              <svg
                className="practice-detail__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M3 21h18" />
                <path d="M6 21V9l6-5 6 5v12" />
                <path d="M10 21v-6h4v6" />
              </svg>
              <h2>Premises Liability for Sports Clubs</h2>
              <p>
                We also act for clubs and venues seeking to understand their exposure,
                reviewing facility maintenance records and incident-reporting procedures to
                reduce the likelihood of a claim reaching our desk from the other side.
              </p>
            </div>
            <div className="practice-detail__examples">
              <h3>Typical Instructions</h3>
              <ul>
                <li>Facility risk assessments</li>
                <li>Incident-reporting procedure review</li>
                <li>Insurance and liability advisory</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              A Quick Illustration
            </span>
            <h2 className="section-title">Claim Estimator</h2>
            <p>
              Adjust the fields below to see how incident type, severity, maintenance
              standards, and time off work shape an itemised illustrative range. Figures are
              invented for demonstration — see the disclaimer.
            </p>
          </div>

          <TrCalculator />
        </div>
      </section>

      <section className="section" id="case-results">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              Selected Outcomes
            </span>
            <h2 className="section-title">Recently Concluded Matters</h2>
            <p>
              A selection of settled instructions, published with details gently anonymised
              and the sums stated plainly. Filter by practice area.
            </p>
          </div>
          <TrCases />
        </div>
      </section>

      <section className="cta-banner">
        <div className="container">
          <div className="section__header">
            <h2 className="section-title reveal">Not Sure Where Your Case Fits?</h2>
            <p className="reveal" style={{ transitionDelay: "80ms" }}>
              Tell us what happened and we&rsquo;ll tell you plainly whether we can help.
            </p>
            <div className="reveal" style={{ transitionDelay: "160ms" }}>
              <Link className="btn btn--primary" href="/turnerandrhodes/contact/">
                Book a Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
