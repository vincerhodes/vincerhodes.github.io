"use client";

// Port of the header half of the static site's assets/js/nav.js. Class names and structure are
// identical to the nav.js-injected markup so web/app/styles.css applies unchanged. Links use
// Next <Link> with clean URLs instead of nav.js's data-base/prefix + .html-suffix hack (routes
// that don't exist yet — /drills/, /drill-builder/ — land in Phase 2/3).
import Link from "next/link";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/drills/", label: "Drills & Sessions" },
  { href: "/gallery/", label: "Gallery" },
  { href: "/about/", label: "About / Join" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-nav" id="site-header">
      <div className="nav-inner">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/monogram.webp" alt="Right Court SC" />
        </Link>
        <nav className={open ? "primary is-open" : "primary"} aria-label="Primary">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          className="hamburger"
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          &#9776;
        </button>
      </div>
    </header>
  );
}
