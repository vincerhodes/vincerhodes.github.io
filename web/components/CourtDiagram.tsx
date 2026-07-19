// React port of the static site's assets/js/court-diagram.js (window.renderCourtDiagram) —
// same viewBox, same geometry, same colors, same path `d` formatting (toFixed(2)), same
// element order (defs → court template → arrows → players) so diagrams render identically to
// the live site. See planning/06-SVG-DIAGRAM-SYSTEM.md for the spec.
// Server component: renders to static SVG markup at build time; no client JS.
import { Fragment } from "react";
import type { CourtDiagramData, DiagramArrow } from "@/lib/sessions";

// viewBox ratio matches a real court's ~6.4m x 9.75m proportions (see 06-SVG-DIAGRAM-SYSTEM.md).
const COURT_WIDTH = 100;
const COURT_LENGTH = 150;

// Brand colors — see 01-BRAND-STYLE-GUIDE.md.
const LINE_COLOR = "#21472E"; // Forest Green
const TEXT_COLOR = "#152218"; // Near-black Green
const WHITE = "#FFFFFF";

const FONT = "system-ui, sans-serif";

function ArrowPath({ arrow, idPrefix }: { arrow: DiagramArrow; idPrefix: string }) {
  const points = (arrow.points ?? []).map(
    (pt) => [pt[0] * COURT_WIDTH, pt[1] * COURT_LENGTH] as const,
  );
  if (points.length < 2) return null;

  // Straight line segments, in array order — no curve-fitting or smoothing (per spec).
  const d = points
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt[0].toFixed(2)},${pt[1].toFixed(2)}`)
    .join(" ");

  const isMovement = arrow.type === "movement";

  // Numbered circle at the arrow's overall midpoint: the midpoint of the middle segment, or
  // the single segment's midpoint for a 2-point arrow (per 06-SVG-DIAGRAM-SYSTEM.md).
  const segmentCount = points.length - 1;
  const midSegmentIndex = Math.floor((segmentCount - 1) / 2);
  const a = points[midSegmentIndex];
  const b = points[midSegmentIndex + 1];
  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={0.7}
        strokeDasharray={isMovement ? "2.2,1.6" : "none"}
        markerEnd={`url(#${idPrefix}-arrowhead-${arrow.type})`}
        className={`arrow arrow-${arrow.type}`}
      />
      <g className="arrow-number">
        <circle cx={midX} cy={midY} r={2.8} fill={WHITE} stroke={LINE_COLOR} strokeWidth={0.5} />
        <text
          x={midX}
          y={midY + 1}
          textAnchor="middle"
          fontSize={2.8}
          fill={LINE_COLOR}
          fontWeight="bold"
          fontFamily={FONT}
        >
          {String(arrow.number)}
        </text>
      </g>
    </>
  );
}

export default function CourtDiagram({
  data,
  idPrefix,
}: {
  data: CourtDiagramData;
  /** Unique prefix for the <marker> ids (the static renderer used a global counter). */
  idPrefix: string;
}) {
  const shortLineY = COURT_LENGTH * 0.56;
  const boxSize = COURT_WIDTH * 0.24;

  return (
    <figure className="court-diagram-figure">
      <svg
        className="court-diagram"
        viewBox={`-8 -12 ${COURT_WIDTH + 16} ${COURT_LENGTH + 18}`}
        role="img"
        aria-label={data.title || "Squash court diagram"}
      >
        <defs>
          {(["ball", "movement"] as const).map((type) => (
            <marker
              key={type}
              id={`${idPrefix}-arrowhead-${type}`}
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={4.5}
              markerHeight={4.5}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={LINE_COLOR} />
            </marker>
          ))}
        </defs>

        {/* Outer court boundary. */}
        <rect
          x={0}
          y={0}
          width={COURT_WIDTH}
          height={COURT_LENGTH}
          fill={WHITE}
          stroke={LINE_COLOR}
          strokeWidth={0.6}
        />
        {/* Front wall — heavier stroke (3x the other lines) along the top edge (y=0), per spec. */}
        <line
          x1={0}
          y1={0}
          x2={COURT_WIDTH}
          y2={0}
          stroke={LINE_COLOR}
          strokeWidth={1.8}
          strokeLinecap="square"
        />
        <text
          x={COURT_WIDTH / 2}
          y={-3.5}
          textAnchor="middle"
          fontSize={3.4}
          fill={TEXT_COLOR}
          letterSpacing="0.2em"
          fontFamily={FONT}
          className="front-wall-label"
        >
          FRONT WALL
        </text>
        {/* Short line. */}
        <line
          x1={0}
          y1={shortLineY}
          x2={COURT_WIDTH}
          y2={shortLineY}
          stroke={LINE_COLOR}
          strokeWidth={0.6}
        />
        {/* Half-court line, from the short line to the back wall. */}
        <line
          x1={COURT_WIDTH / 2}
          y1={shortLineY}
          x2={COURT_WIDTH / 2}
          y2={COURT_LENGTH}
          stroke={LINE_COLOR}
          strokeWidth={0.6}
        />
        {/* Both service boxes. */}
        {[0, COURT_WIDTH - boxSize].map((bx) => (
          <rect
            key={bx}
            x={bx}
            y={shortLineY}
            width={boxSize}
            height={boxSize}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={0.6}
          />
        ))}

        {(data.arrows ?? []).map((arrow, i) => (
          <ArrowPath key={i} arrow={arrow} idPrefix={idPrefix} />
        ))}

        {(data.players ?? []).map((p, i) => {
          const cx = p.x * COURT_WIDTH;
          const cy = p.y * COURT_LENGTH;
          return (
            <Fragment key={i}>
              <text
                x={cx}
                y={cy - 4.5}
                textAnchor="middle"
                fontSize={2.8}
                fill={TEXT_COLOR}
                fontFamily={FONT}
              >
                {p.label || ""}
              </text>
              <g className="player">
                <circle cx={cx} cy={cy} r={3.6} fill={p.color} stroke={WHITE} strokeWidth={0.5} />
                <text
                  x={cx}
                  y={cy + 1.1}
                  textAnchor="middle"
                  fontSize={3.2}
                  fill={WHITE}
                  fontWeight="bold"
                  fontFamily={FONT}
                >
                  {p.id || ""}
                </text>
              </g>
            </Fragment>
          );
        })}
      </svg>
      {data.title ? <figcaption className="court-diagram-caption">{data.title}</figcaption> : null}
    </figure>
  );
}
