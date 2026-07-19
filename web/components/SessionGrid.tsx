"use client";

// Port of the theme-filter behaviour from the static drills/index.html inline script:
// one active button at a time (aria-pressed), cards hidden via the `hidden` attribute when
// their data-themes tokens don't include the active theme, and a .no-results message when
// nothing matches. Filter tokens are the hyphen form (e.g. "serves-returns") — see HANDOFF
// "Decisions taken" for why the slash form from content front-matter must NOT leak in here.
import Link from "next/link";
import { useState } from "react";

const THEME_BUTTONS: { token: string; label: string }[] = [
  { token: "all", label: "All" },
  { token: "length", label: "Length" },
  { token: "volleys", label: "Volleys" },
  { token: "drops", label: "Drops" },
  { token: "boasts", label: "Boasts" },
  { token: "movement", label: "Movement" },
  { token: "front-court", label: "Front-court" },
  { token: "deception", label: "Deception" },
  { token: "serves-returns", label: "Serves & Returns" },
  { token: "exhibition-shots", label: "Exhibition Shots" },
];

export interface SessionCardData {
  slug: string;
  number: number;
  shortTitle: string;
  cardMeta: string;
  filterThemes: string[];
}

/** The static site's filter predicate: `theme === 'all' || dataThemes.split(' ').includes(theme)`. */
export function cardMatchesTheme(filterThemes: string[], theme: string): boolean {
  return theme === "all" || filterThemes.includes(theme);
}

export default function SessionGrid({ sessions }: { sessions: SessionCardData[] }) {
  const [active, setActive] = useState("all");
  const visibleCount = sessions.filter((s) => cardMatchesTheme(s.filterThemes, active)).length;

  return (
    <>
      <div className="theme-filter" role="group" aria-label="Filter sessions by skill theme">
        {THEME_BUTTONS.map((btn) => (
          <button
            key={btn.token}
            type="button"
            data-theme={btn.token}
            aria-pressed={active === btn.token}
            onClick={() => setActive(btn.token)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="session-grid" id="session-grid">
        {sessions.map((s) => (
          <Link
            key={s.slug}
            className="session-card"
            href={`/drills/${s.slug}/`}
            data-themes={s.filterThemes.join(" ")}
            hidden={!cardMatchesTheme(s.filterThemes, active)}
          >
            <p className="session-number">Session {s.number}</p>
            <h3>{s.shortTitle}</h3>
            <p className="session-date">{s.cardMeta}</p>
          </Link>
        ))}
      </div>

      <p className="no-results" id="no-results" hidden={visibleCount !== 0}>
        No sessions match that theme yet — check back soon.
      </p>
    </>
  );
}
