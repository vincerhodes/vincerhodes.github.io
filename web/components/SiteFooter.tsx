// Port of the footer half of the static site's assets/js/nav.js (footerHtml string). Class names
// and structure identical to the nav.js-injected markup so web/app/styles.css applies unchanged.
// The Turner & Rhodes footer link is part of the current live nav.js — ported as-is.
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer id="site-footer">
      <div className="footer-inner">
        <div className="col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="monogram"
            src="/logos/monogram.webp"
            alt="Right Court SC monogram"
          />
        </div>
        <div className="col">
          <h4>Get in touch</h4>
          <a href="mailto:info@rightcourtsc.com">info@rightcourtsc.com</a>
          <p>Wed 18:00–20:00 &amp; Sat 09:00–11:00 — Feeling Squash</p>
        </div>
        <div className="col">
          <h4>Quick links</h4>
          <Link href="/drill-builder/">Drill Builder</Link>
          <Link href="/saved-drills/">Saved drills</Link>
          <Link href="/founding-squashers/">Founding Squashers</Link>
          <Link href="/about/">About / Join</Link>
        </div>
      </div>
      <p className="copyright">
        &copy; 2026 Right Court SC. All rights reserved (mostly the wrongs too).
      </p>
      <p className="copyright">
        <a href="https://rightcourtsc.com/turnerandrhodes/">
          Injured on court? Turner &amp; Rhodes Solicitors — no boast, no win, no fee.
        </a>
      </p>
    </footer>
  );
}
