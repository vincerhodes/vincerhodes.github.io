"use client";

// T&R header — port of the shared <header> markup from the source pages plus the
// theme-toggle and mobile-nav halves of js/main.js. The theme itself lives on
// <html data-theme> exactly like the source site; the inline boot script in
// app/turnerandrhodes/layout.tsx sets it before paint, this component owns toggling it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import TrCrest from "./TrCrest";

const THEME_KEY = "tr-theme";

const NAV_ITEMS = [
  { href: "/turnerandrhodes/", label: "Home" },
  { href: "/turnerandrhodes/about/", label: "About" },
  { href: "/turnerandrhodes/practice-areas/", label: "Practice Areas" },
  { href: "/turnerandrhodes/team/", label: "Our Team" },
  { href: "/turnerandrhodes/contact/", label: "Contact" },
];

function currentTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export default function TrHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Mirrors the source HTML's static defaults; synced to the real theme on mount
  // (same as main.js applyTheme running at DOMContentLoaded).
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sync the toggle's aria state with the theme the pre-hydration boot script applied to
  // <html> (ports main.js applyTheme running at DOMContentLoaded — the SSR markup mirrors
  // the source's static defaults, then corrects on mount).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount sync from documentElement, an external system the boot script owns.
    setTheme(currentTheme());
  }, []);

  function toggleTheme() {
    const next = currentTheme() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore persistence failure — same as main.js */
    }
    setTheme(next);
  }

  const normalised = pathname.endsWith("/") ? pathname : pathname + "/";

  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/turnerandrhodes/" className="brand">
          <TrCrest />
          <span className="brand__name">
            Turner <em>&amp;</em> Rhodes
            <span className="brand__sub">Solicitors at Law</span>
          </span>
        </Link>
        <nav
          className={open ? "nav__links is-open" : "nav__links"}
          id="nav-links"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={normalised === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav__actions">
          <button
            className="theme-toggle"
            type="button"
            aria-pressed={theme === "light"}
            aria-label={
              theme === "light"
                ? "Switch to Chambers Dark theme"
                : "Switch to Reading Room Light theme"
            }
            onClick={toggleTheme}
          >
            <svg
              className="icon-moon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
            <svg
              className="icon-sun"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
          <Link
            className="btn btn--ghost"
            href="/turnerandrhodes/contact/"
            style={{ padding: "10px 18px" }}
          >
            Enquire
          </Link>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded={open}
            aria-controls="nav-links"
            aria-label="Toggle menu"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
