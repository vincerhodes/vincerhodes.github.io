"use client";

// Port of the static site's assets/js/ball-loader.js (window.RCBallLoader) to React. The SVG
// scene, pattern modifier classes, and accessible-label behaviour are identical to the original
// markup so web/app/ball-loader.css applies unchanged.
//
// API for consumers (the drill builder in Phase 3):
//   <BallLoader message="..." theme="..." />   — declarative; theme maps to a fixed pattern via
//                                                THEME_PATTERN, or a random pattern when unmapped.
//   <BallLoader message="..." pattern="drop"/> — exact named pattern (QA/demo use).
//   useBallLoader()                            — imperative-ish show/hide hook mirroring the
//                                                original mount()/destroy() pair.
//
// One deliberate difference from the original: when a random pattern is needed (unmapped theme or
// "surprise me"), the SVG only renders after mount — picking Math.random() during SSR would
// hydrate-mismatch against the client. Mapped and explicit patterns render fully during SSR.
import { useRef, useState, useSyncExternalStore } from "react";

// Each pattern is a distinct tracer path/squash/timing combo (see ball-loader.css for the actual
// keyframes) named after a real squash shot — every one ends its final impact on the front wall,
// since that's the actual rule (every shot must reach the front wall).
export const PATTERNS = [
  "drive",
  "boast",
  "drop",
  "volley",
  "lob",
  "nick",
  "reverse",
  "corkscrew",
  "crosscourt",
] as const;

export type BallLoaderPattern = (typeof PATTERNS)[number];

// Maps a drill-builder theme value to the pattern that best matches the shot it describes.
// Themes not listed here (and "surprise me") fall through to a random pick.
export const THEME_PATTERN: Record<string, BallLoaderPattern> = {
  length: "drive",
  volleys: "volley",
  drops: "drop",
  boasts: "boast",
  movement: "crosscourt",
  "front-court": "nick",
  deception: "reverse",
  "serves/returns": "lob",
  "exhibition-shots": "corkscrew",
};

export function randomPattern(): BallLoaderPattern {
  return PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
}

// Returns the fixed pattern for a theme, or null when the theme has no mapping (original
// resolvePattern() would pick randomly — callers that need SSR-safe rendering check for null).
export function mappedPattern(theme?: string): BallLoaderPattern | null {
  if (theme && Object.prototype.hasOwnProperty.call(THEME_PATTERN, theme)) {
    return THEME_PATTERN[theme];
  }
  return null;
}

function BallSpinnerSvg({ pattern }: { pattern: BallLoaderPattern }) {
  // Same elements/class names as ball-loader.js's svg(). The racket is drawn around a grip at
  // local (0,0) so the swing is a pure rotation about the hand; the outer group positions the
  // grip per-pattern. Behind the ball so the ball stays visible.
  return (
    <svg
      className="ball-spinner-svg"
      width="140"
      height="105"
      viewBox="0 0 160 120"
      aria-hidden="true"
    >
      <polygon className="ball-spinner-wall-side" points="70,53 10,78 10,32 70,7" />
      <polygon className="ball-spinner-wall-front" points="70,53 130,78 130,32 70,7" />
      <line className="ball-spinner-tin" x1="70" y1="46" x2="130" y2="71" />
      <polygon className="ball-spinner-floor" points="10,78 70,103 130,78 70,53" />
      <line className="ball-spinner-plank" x1="30" y1="70" x2="90" y2="95" />
      <line className="ball-spinner-plank" x1="50" y1="62" x2="110" y2="87" />
      <g className={`ball-spinner-racket-pos ball-spinner-racket-pos--${pattern}`}>
        <g className="ball-spinner-racket">
          <line className="ball-spinner-racket-handle" x1="0" y1="0" x2="9" y2="-10" />
          <line className="ball-spinner-racket-throat" x1="9" y1="-10" x2="11.1" y2="-15.4" />
          <line className="ball-spinner-racket-throat" x1="9" y1="-10" x2="14.1" y2="-12.8" />
          <path
            className="ball-spinner-racket-frame"
            d="M12.6,-14.1 Q8.4,-27.3 24.7,-27.4 Q26.3,-11.2 12.6,-14.1 Z"
          />
          <line className="ball-spinner-racket-strings" x1="16" y1="-25.2" x2="23.4" y2="-18.6" />
          <line className="ball-spinner-racket-strings" x1="14" y1="-22.9" x2="21.4" y2="-16.3" />
          <line className="ball-spinner-racket-strings" x1="13.4" y1="-20.1" x2="18.6" y2="-15.5" />
          <line className="ball-spinner-racket-strings" x1="15.5" y1="-14.2" x2="24.8" y2="-24.6" />
          <line className="ball-spinner-racket-strings" x1="12.5" y1="-16.8" x2="21.8" y2="-27.2" />
        </g>
      </g>
      <ellipse
        className={`ball-spinner-shadow ball-spinner-shadow--${pattern}`}
        cx="37"
        cy="89"
        rx="10"
        ry="4"
      />
      <g className={`ball-spinner-arc ball-spinner-arc--${pattern}`}>
        <g className="ball-spinner-spin">
          <circle className="ball-spinner-body" cx="37" cy="89" r="8" />
          <circle className="ball-spinner-dot" cx="35" cy="86" r="1.4" />
          <circle className="ball-spinner-dot" cx="38.5" cy="88" r="1.4" />
        </g>
      </g>
    </svg>
  );
}

export type BallLoaderProps = {
  message?: string;
  theme?: string;
  pattern?: BallLoaderPattern;
};

export function BallLoader({ message, theme, pattern: patternProp }: BallLoaderProps) {
  // Explicit pattern wins; then the theme's fixed mapping; then a random pick. The random pick
  // can't happen during SSR (it would hydrate-mismatch against the client), so it goes through
  // useSyncExternalStore: the server snapshot is null (label only) and the client snapshot is a
  // per-instance cached random pattern, picked once after hydration.
  const randomRef = useRef<BallLoaderPattern | null>(null);
  const random = useSyncExternalStore(
    () => () => {},
    () => {
      if (randomRef.current === null) randomRef.current = randomPattern();
      return randomRef.current;
    },
    () => null,
  );
  const pattern = patternProp ?? mappedPattern(theme) ?? random;

  // The SVG is aria-hidden, so the accessible loading signal lives in the label: the visible
  // message when given, otherwise a visually-hidden "Loading…" — never a silent spinner.
  return (
    <span className="ball-spinner" role="status" aria-live="polite">
      {pattern !== null && <BallSpinnerSvg pattern={pattern} />}
      {message ? (
        <span className="ball-spinner-label">{message}</span>
      ) : (
        <span className="ball-spinner-label ball-spinner-vh">Loading…</span>
      )}
    </span>
  );
}

export type UseBallLoaderOptions = { message?: string; theme?: string };

// Imperative-ish show/hide hook mirroring the original RCBallLoader.mount()/destroy() pair.
// Render `loader` where the loader should appear; call show()/hide() to toggle it. Unlike the
// original mount(), the consumer's container visibility is the consumer's business — hide()
// removes the loader entirely, so there's no leftover [hidden] container to manage.
export function useBallLoader() {
  const [options, setOptions] = useState<UseBallLoaderOptions | null>(null);

  return {
    loader: options ? <BallLoader message={options.message} theme={options.theme} /> : null,
    show: (opts?: UseBallLoaderOptions) => setOptions(opts ?? {}),
    hide: () => setOptions(null),
    visible: options !== null,
  };
}

export default BallLoader;
