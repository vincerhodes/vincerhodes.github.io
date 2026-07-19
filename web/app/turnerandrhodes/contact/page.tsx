// Port of the T&R source site's contact.html. Content verbatim; memo.css is scoped as
// tr-memo.css and imported here (the source loaded it on this page only); the enquiry
// form validation from main.js and memo.js are ported to TrContactForm and TrMemoForm.
import type { Metadata } from "next";
import TrContactForm from "@/components/tr/TrContactForm";
import TrMemoForm from "@/components/tr/TrMemoForm";
import "../tr-memo.css";

export const metadata: Metadata = {
  title: "Contact | Turner & Rhodes Solicitors",
  description:
    "Get in touch with Turner & Rhodes Solicitors to discuss a sports, court, or personal injury claim.",
};

export default function TurnerRhodesContact() {
  return (
    <main id="main">
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Get in Touch</span>
          <h1 className="page-header__title">Contact Turner &amp; Rhodes</h1>
          <p className="page-header__lede">
            Confidential, no-obligation consultations. Tell us what happened and we&rsquo;ll
            tell you plainly whether we can help.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div className="reveal">
              <h2 style={{ marginBottom: "24px" }}>Our Office</h2>

              <div className="contact-info__item">
                <svg
                  className="contact-info__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <div>
                  <p className="contact-info__label">Address</p>
                  <p className="contact-info__value">14 Wrenfield Court, London WC9 9ZZ</p>
                </div>
              </div>

              <div className="contact-info__item">
                <svg
                  className="contact-info__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.98.36 1.94.68 2.86a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.22-1.25a2 2 0 0 1 2.11-.45c.92.32 1.88.55 2.86.68A2 2 0 0 1 22 16.92Z" />
                </svg>
                <div>
                  <p className="contact-info__label">Telephone</p>
                  <p className="contact-info__value">020 7946 0192</p>
                </div>
              </div>

              <div className="contact-info__item">
                <svg
                  className="contact-info__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
                <div>
                  <p className="contact-info__label">Email</p>
                  <p className="contact-info__value">clerks@turnerandrhodes.example</p>
                </div>
              </div>

              <div className="contact-info__item">
                <svg
                  className="contact-info__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.2 2" />
                </svg>
                <div>
                  <p className="contact-info__label">Office Hours</p>
                  <p className="contact-info__value">Mon&ndash;Fri, 9:00&ndash;18:00</p>
                </div>
              </div>

              <p className="form-note" style={{ marginTop: "28px" }}>
                This is a demonstration website built to showcase front-end and JavaScript
                work. Turner &amp; Rhodes is a fictional firm — the details above are
                illustrative, and the form opposite does not send your enquiry anywhere.
              </p>
            </div>

            <TrContactForm />
          </div>
        </div>
      </section>

      <section className="section section--alt memo-section">
        <div className="container">
          <div className="section__header section__header--center reveal">
            <span className="eyebrow">For the Record</span>
            <h2 className="section-title">The Incident Memorandum</h2>
            <p>
              Document your incident with the formality it deserves. Complete the particulars
              below and we shall prepare a formal memorandum suitable for framing,
              forwarding, or quietly pinning to the club noticeboard.
            </p>
          </div>

          <TrMemoForm />
        </div>
      </section>
    </main>
  );
}
