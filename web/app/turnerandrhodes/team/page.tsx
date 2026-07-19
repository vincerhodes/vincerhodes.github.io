// Port of the T&R source site's team.html. Content verbatim; the only script the source
// page used was main.js (ported to the T&R layout's TrHeader/TrEffects).
import type { Metadata } from "next";
import Link from "next/link";
import TrSpotlight from "@/components/tr/TrSpotlight";

export const metadata: Metadata = {
  title: "Our Team | Turner & Rhodes Solicitors",
  description:
    "Meet the solicitors and associates of Turner & Rhodes, a City of London firm specialising in sports and personal injury claims.",
};

const TEAM = [
  {
    initials: "ST",
    name: "Simon Turner",
    role: "Senior Partner",
    creds: "Qualified 2004 · Liability & Court-Surface Claims",
    quote: "An injury doesn't stop being serious because it sounds unusual.",
  },
  {
    initials: "ER",
    name: "Eleanor Rhodes",
    role: "Senior Partner",
    creds: "Qualified 2003 · Ocular Trauma & Client Relations",
    quote: "Preparation is the only variable we can fully control.",
  },
  {
    initials: "PC",
    name: "Priya Chandrasekaran",
    role: "Associate Solicitor",
    creds: "Qualified 2016 · Squash & Racquetball Claims",
    quote: "I've read more court-maintenance logs than I'd care to admit.",
  },
  {
    initials: "MW",
    name: "Marcus Whitlock-Reed",
    role: "Associate Solicitor",
    creds: "Qualified 2018 · Ocular & Eye Trauma Unit",
    quote: "Long-term prognosis is where these cases are actually won.",
  },
  {
    initials: "DO",
    name: "Dev Okafor",
    role: "Trainee Solicitor",
    creds: "Public Liability & Premises Claims",
    quote: "Every changing-room floor has a story. Usually a wet one.",
  },
  {
    initials: "HB",
    name: "Harriet Bloom-Ashworth",
    role: "Senior Litigation Clerk",
    creds: "Case Management & Client Correspondence",
    quote: "I'm usually the first voice you'll hear from us.",
  },
];

export default function TurnerRhodesTeam() {
  return (
    <main id="main">
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">The People</span>
          <h1 className="page-header__title">Our Team</h1>
          <p className="page-header__lede">
            A small firm by design — every matter is handled by someone who has argued one
            very like it before.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="team-grid reveal-stagger">
            {TEAM.map((member) => (
              <article className="team-card reveal" key={member.initials}>
                <div className="team-card__avatar">{member.initials}</div>
                <h2 className="team-card__name">{member.name}</h2>
                <p className="team-card__role">{member.role}</p>
                <p className="team-card__creds">{member.creds}</p>
                <p className="team-card__quote">&ldquo;{member.quote}&rdquo;</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TrSpotlight />

      <section className="cta-banner">
        <div className="container">
          <div className="section__header">
            <h2 className="section-title reveal">Speak to a Member of the Team</h2>
            <p className="reveal" style={{ transitionDelay: "80ms" }}>
              Consultations are confidential and carry no obligation.
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
