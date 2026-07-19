"use client";

// Port of js/cases.js — case results gallery with practice-area filters. The source
// built the cards from data at DOMContentLoaded; here they're rendered directly (same
// DOM, visible without JS too). Filtering, stagger animation delays, the live status
// line, and the entrance animation (off under prefers-reduced-motion via the CSS) are
// all faithful to the source.
import { useState } from "react";

const AREA_LABELS: Record<string, string> = {
  sports: "Sports Injury",
  squash: "Squash & Racquetball",
  ocular: "Ocular & Eye Trauma",
  slip: "Slip & Trip",
};

interface CaseItem {
  title: string;
  area: string;
  year: number;
  outcome: string;
  summary: string;
}

const CASES: CaseItem[] = [
  {
    title: "Whitfield v. Barbican Squash Club (Court 3, ricochet)",
    area: "squash",
    year: 2024,
    outcome: "Settled — £18,500",
    summary:
      "Claimant struck by a ball that rebounded off a side wall with what the independent expert described as 'unusual enthusiasm'. Liability admitted after the club's own maintenance log was read aloud in a quiet room.",
  },
  {
    title: "Okonkwo v. The Racquets Club of Pall Mall",
    area: "squash",
    year: 2023,
    outcome: "Settled — £27,250",
    summary:
      "A tin set two millimetres above regulation height produced a bounce the claimant's ankle declined to survive. The club argued the tin had character; we argued it had a duty of care.",
  },
  {
    title: "Hargreaves v. Wrenfield Leisure Trust",
    area: "squash",
    year: 2022,
    outcome: "Settled — £9,800",
    summary:
      "Court lighting so poor the claimant mistook his doubles partner for the ball. The Trust conceded that 'ambient' was not, on reflection, a recognised lux rating.",
  },
  {
    title: "Devereux v. City & Wharf Squash Courts Ltd",
    area: "squash",
    year: 2025,
    outcome: "Settled — £33,000",
    summary:
      "Glass-back-wall impact following a boast shot played with more optimism than accuracy. The wall had been 'due for inspection' since 2019. The inspection is now complete.",
  },
  {
    title: "Amari v. Northgate Sports Village",
    area: "ocular",
    year: 2023,
    outcome: "Settled — £41,750",
    summary:
      "Ball-to-eye impact where the venue's eyewear policy consisted of a poster, in a drawer, facing the wall. The ophthalmologist's prognosis report ran to fourteen pages; the venue's defence did not.",
  },
  {
    title: "Sinclair v. The Queen's Gate Racquet Club",
    area: "ocular",
    year: 2024,
    outcome: "Settled — £24,100",
    summary:
      "Protective eyewear supplied by the club shattered on first contact with a regulation ball travelling at a regulation speed. The word 'protective' was discussed at some length.",
  },
  {
    title: "Blythe v. Hampstead Heath Touch Rugby Society",
    area: "sports",
    year: 2022,
    outcome: "Settled — £7,600",
    summary:
      "A 'touch' fixture at which contact was made with sufficient force to be visible from the adjoining pitch. The Society's fixture card has since been amended to manage expectations.",
  },
  {
    title: "Okafor v. East London Five-a-Side League",
    area: "sports",
    year: 2024,
    outcome: "Settled — £12,300",
    summary:
      "Claimant injured after being scheduled for three fixtures in one evening, a workload the League described as 'character building'. Medical evidence described it differently.",
  },
  {
    title: "Pringle v. Courtfield Health & Racket Club",
    area: "slip",
    year: 2023,
    outcome: "Settled — £6,900",
    summary:
      "Wet changing-room floor, no signage, one witness who applauded. The club's cleaning rota was produced under disclosure and is now framed in our office as a cautionary tale.",
  },
  {
    title: "Mwamba v. Albion Squash & Fitness",
    area: "slip",
    year: 2025,
    outcome: "Settled — £11,450",
    summary:
      "Unmarked step between courts 2 and 3, painted in a shade of grey best described as 'concealment'. Settled after the site's own risk assessment was found to predate the step.",
  },
];

const FILTERS = [
  { area: "all", label: "All matters" },
  { area: "squash", label: "Squash & Racquetball" },
  { area: "ocular", label: "Ocular & Eye Trauma" },
  { area: "sports", label: "Sports Injury" },
  { area: "slip", label: "Slip & Trip" },
];

export default function TrCases() {
  const [filter, setFilter] = useState("all");

  let shown = 0;
  const cards = CASES.map((item) => {
    const match = filter === "all" || item.area === filter;
    const stagger = match ? shown++ : 0;
    return { item, match, stagger };
  });

  return (
    <>
      <div
        className="case-filters reveal"
        id="case-filters"
        role="group"
        aria-label="Filter matters by practice area"
      >
        {FILTERS.map((chip) => (
          <button
            key={chip.area}
            className="chip"
            type="button"
            data-area={chip.area}
            aria-pressed={filter === chip.area}
            onClick={() => setFilter(chip.area)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className="case-status" id="case-status" aria-live="polite">
        Showing {shown} of {CASES.length} {shown === 1 ? "matter." : "matters."}
      </p>
      <div className="case-grid" id="case-grid">
        {cards.map(({ item, match, stagger }) => (
          <article
            // Remount on refilter so the entrance animation replays, matching the
            // source's force-reflow trick.
            key={`${filter}-${item.title}`}
            className={
              "case-card case-card--in" + (match ? "" : " is-hidden")
            }
            data-area={item.area}
            style={{ animationDelay: `${stagger * 55}ms` }}
          >
            <span className="case-card__tag">{AREA_LABELS[item.area]}</span>
            <h3 className="case-card__title">{item.title}</h3>
            <p className="case-card__meta">
              {item.year} · {item.outcome}
            </p>
            <p className="case-card__summary">{item.summary}</p>
          </article>
        ))}
      </div>
    </>
  );
}
