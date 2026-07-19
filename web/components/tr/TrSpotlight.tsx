// The "Advertisement" spotlight card linking back to Right Court SC — appears on the
// T&R home, about, and team pages. Markup verbatim from the source pages.
export default function TrSpotlight() {
  return (
    <section className="spotlight-slot">
      <div className="container">
        <a
          className="spotlight-card"
          href="https://rightcourtsc.com/"
          target="_blank"
          rel="noopener sponsored"
          aria-label="Advertisement: Right Court SC, a recreational squash club — opens in a new tab"
        >
          <span className="spotlight-card__label">Advertisement</span>
          <div className="spotlight-card__content">
            <svg
              className="spotlight-card__icon"
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <ellipse cx="16" cy="14" rx="9" ry="11" />
              <line x1="16" y1="25" x2="16" y2="36" />
              <line x1="12" y1="6" x2="12" y2="22" />
              <line x1="20" y1="6" x2="20" y2="22" />
              <line x1="8" y1="11" x2="24" y2="11" />
              <line x1="8" y1="17" x2="24" y2="17" />
              <circle cx="30" cy="28" r="3" fill="currentColor" stroke="none" />
            </svg>
            <div className="spotlight-card__text">
              <span className="spotlight-card__brand">Right Court SC</span>
              <span className="spotlight-card__tagline">
                Recreational squash, played with intent. Wed 18:00&ndash;20:00 &amp; Sat
                09:00&ndash;11:00 at Feeling Squash.
              </span>
            </div>
            <span className="spotlight-card__cta">Visit Site &rarr;</span>
          </div>
        </a>
      </div>
    </section>
  );
}
