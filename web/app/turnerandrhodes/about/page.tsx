// Port of the T&R source site's about.html. Content verbatim; the timeline interaction
// from counters.js is ported to TrCounters (the first item's active state and the
// role/tabindex/aria attributes counters.js set via JS are rendered directly here).
import type { Metadata } from "next";
import TrCounters from "@/components/tr/TrCounters";
import TrSpotlight from "@/components/tr/TrSpotlight";

export const metadata: Metadata = {
  title: "About Us | Turner & Rhodes Solicitors",
  description:
    "The history, values, and founding partners of Turner & Rhodes Solicitors — City of London specialists in sports and personal injury claims since 2009.",
};

const TIMELINE = [
  {
    year: "2009",
    title: "Turner & Rhodes Founded",
    body: "Simon Turner and Eleanor Rhodes established the firm from a single room off Wrenfield Court, taking on personal injury instructions other firms considered too niche to pursue.",
  },
  {
    year: "2012",
    title: "The Squash Court Precedent",
    body: "Argued one of the first reported instructions attributing liability for a court-surface defect in a racquetball injury — a framework the firm still applies today.",
  },
  {
    year: "2015",
    title: "Ocular Trauma Unit Established",
    body: "Formalised a dedicated practice for eye-injury claims following a marked rise in racquet-sport instructions referred by regional clubs.",
  },
  {
    year: "2019",
    title: "1,000th Claim Settled",
    body: "The firm settled its 1,000th matter, marking a decade of specialist practice in sports and personal injury law.",
  },
  {
    year: "2023",
    title: "Expanded Offices",
    body: "Relocated to larger offices at 14 Wrenfield Court to accommodate a growing caseload and an expanding team of associates.",
  },
  {
    year: "Present Day",
    title: "Continuing the Practice",
    body: "Turner & Rhodes continues to represent clients with the discretion and rigour the firm was founded on.",
  },
];

export default function TurnerRhodesAbout() {
  return (
    <main id="main">
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">About the Firm</span>
          <h1 className="page-header__title">A Firm Built on Taking the Unusual Seriously</h1>
          <p className="page-header__lede">
            Turner &amp; Rhodes was founded on a simple premise: an injury is an injury,
            whatever the court, court surface, or piece of sporting equipment involved.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              Our History
            </span>
            <h2 className="section-title">Seventeen Years in Practice</h2>
            <p>Select an entry to read more.</p>
          </div>
          <div className="timeline reveal">
            {TIMELINE.map((item, index) => (
              <div
                key={item.year}
                className={index === 0 ? "timeline__item is-active" : "timeline__item"}
                role="button"
                tabIndex={0}
                aria-expanded={index === 0}
              >
                <span className="timeline__year">{item.year}</span>
                <div className="timeline__body" aria-hidden={index !== 0}>
                  <h3 className="timeline__title">{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              Founding Partners
            </span>
            <h2 className="section-title">Turner. Rhodes.</h2>
          </div>
          <div className="bio-grid reveal-stagger">
            <div className="bio-card reveal">
              <div className="bio-card__avatar">ST</div>
              <div>
                <h3 style={{ marginBottom: "2px" }}>Simon Turner</h3>
                <p className="team-card__role" style={{ marginBottom: "10px" }}>
                  Senior Partner
                </p>
                <p>
                  Qualified as a solicitor in 2004 before co-founding the firm in 2009. Simon
                  leads on liability arguments and has represented clients in county courts
                  across the South East on court-surface and premises claims.
                </p>
              </div>
            </div>
            <div className="bio-card reveal">
              <div className="bio-card__avatar">ER</div>
              <div>
                <h3 style={{ marginBottom: "2px" }}>Eleanor Rhodes</h3>
                <p className="team-card__role" style={{ marginBottom: "10px" }}>
                  Senior Partner
                </p>
                <p>
                  Formerly of a mid-sized City practice, Eleanor established the firm&rsquo;s
                  ocular trauma unit and has led client relations since 2009 with a reputation
                  for exacting preparation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              Our Values
            </span>
            <h2 className="section-title">How We Work</h2>
          </div>
          <div className="values-grid reveal-stagger">
            <div className="value-card reveal">
              <h3>Discretion</h3>
              <p>
                Every matter is handled with the confidentiality expected of the legal
                profession, regardless of how the incident occurred.
              </p>
            </div>
            <div className="value-card reveal">
              <h3>Rigour</h3>
              <p>
                We prepare unusual claims to the same evidentiary standard as any commercial
                dispute.
              </p>
            </div>
            <div className="value-card reveal">
              <h3>No Claim Too Unusual</h3>
              <p>
                If it happened on a court, a pitch, or the pavement outside one, we&rsquo;ve
                very likely seen it before.
              </p>
            </div>
          </div>
        </div>
      </section>

      <TrSpotlight />

      <TrCounters />
    </main>
  );
}
