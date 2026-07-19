"use client";

// Port of loader-demo/index.html's inline script. Exercises the BallLoader component the same
// way the original exercised window.RCBallLoader: a theme picker showing exactly what the drill
// builder would show per theme, plus a card per named pattern.
//
// One difference from the original: for unmapped themes the original rendered markup() (random
// pick) and read the used pattern back out of the DOM's modifier class. Here the demo picks the
// random pattern itself and passes it as an explicit prop, so the label can say which one was
// shown without DOM scraping. Mapped themes pass the theme prop straight through.
import { useState } from "react";
import {
  BallLoader,
  PATTERNS,
  mappedPattern,
  randomPattern,
  type BallLoaderPattern,
} from "@/components/BallLoader";

const PATTERN_DESCRIPTIONS: Record<BallLoaderPattern, string> = {
  drive: "Long, flat drive parallel to the side wall, deep into the front wall.",
  boast: "2-wall boast — side wall first, then deflects across to the front wall.",
  drop: "Soft and low, but still travels all the way to the front wall — dies there.",
  volley: "Quick and direct, hit crisply above the tin — struck early, no floor bounce.",
  lob: "Big, high, floaty shot that dies near the top of the front wall.",
  nick: "Front wall, then dies in the crack where wall meets wall meets floor.",
  reverse:
    'Reverse angle boast — swings the "wrong" way first, then cuts into the side wall before the front wall.',
  corkscrew: "Showy trick shot — loops out, spins hard, and slams into the front wall.",
  crosscourt: "Cross-court drive — travels wide across the floor before hitting the front wall.",
};

// Same options as the real drill-builder theme dropdown (worker/src/schema.js THEMES).
const THEMES = [
  "length",
  "volleys",
  "drops",
  "boasts",
  "movement",
  "front-court",
  "deception",
  "serves/returns",
  "exhibition-shots",
  "surprise me",
];

export default function LoaderDemo() {
  const [theme, setTheme] = useState(THEMES[0]);
  // For unmapped themes, pick the random pattern here so the label can name it (see header note).
  // Picked once per theme selection, mirroring "random pattern each time" per render.
  const [randomPick, setRandomPick] = useState<BallLoaderPattern>(randomPattern);

  const mapped = mappedPattern(theme);
  const shownPattern = mapped ?? randomPick;

  const onThemeChange = (next: string) => {
    setTheme(next);
    if (!mappedPattern(next)) setRandomPick(randomPattern());
  };

  return (
    <main className="demo-content">
      <p>
        Every tracer pattern the squash-ball loader can show, larger than they render in the real
        drill builder. Pick a theme below to see exactly what the drill builder would show for it,
        or browse the full set underneath. This page isn&rsquo;t linked from the site nav —
        it&rsquo;s a dev tool for eyeballing the patterns, not public content.
      </p>

      <div className="demo-picker">
        <label htmlFor="theme-select">Preview by drill-builder theme</label>
        <select id="theme-select" value={theme} onChange={(e) => onThemeChange(e.target.value)}>
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="demo-picker-loader" id="picked-loader">
          {mapped ? (
            <BallLoader message="" theme={theme} />
          ) : (
            <BallLoader message="" pattern={shownPattern} />
          )}
        </div>
        <p className="demo-picker-pattern" id="picked-pattern-label">
          {mapped
            ? `Theme "${theme}" -> pattern: `
            : `Theme "${theme}" has no fixed mapping -> random pattern each time: `}
          <code>{shownPattern}</code>
        </p>
      </div>

      <div className="demo-grid">
        <h2>All patterns</h2>
        <div className="demo-grid-items" id="pattern-grid">
          {PATTERNS.map((pattern) => (
            <div className="demo-card" key={pattern}>
              <h3>{pattern}</h3>
              <p>{PATTERN_DESCRIPTIONS[pattern]}</p>
              <div>
                <BallLoader message="" pattern={pattern} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
