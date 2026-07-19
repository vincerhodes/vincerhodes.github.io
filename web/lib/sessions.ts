// Sessions content pipeline (Phase 2 of planning/07-VPS-MIGRATION.md).
// Reads the repo-root content directory IN PLACE (../content/sessions relative to web/) — the
// markdown + diagram JSON files are the source of truth and are not copied into web/. Everything
// here runs at build time (SSG via generateStaticParams), so no runtime fs access is needed.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT_DIR = path.resolve(process.cwd(), "../content/sessions");

// ---------------------------------------------------------------------------
// Types (diagram schema mirrors planning/06-SVG-DIAGRAM-SYSTEM.md exactly)
// ---------------------------------------------------------------------------

export interface DiagramPlayer {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
}

export interface DiagramArrow {
  number: number;
  type: "ball" | "movement";
  points: [number, number][];
}

export interface CourtDiagramData {
  title: string;
  players: DiagramPlayer[];
  arrows: DiagramArrow[];
}

export interface SessionSummary {
  slug: string;
  number: number;
  /** Full front-matter title, e.g. "Session 1 — Straight Length and the T". */
  title: string;
  /** Title without the "Session N — " prefix, e.g. "Straight Length and the T". */
  shortTitle: string;
  /** Front-matter theme verbatim (may be the slash form, e.g. "serves/returns"). */
  theme: string;
  themeDisplay: string;
  /**
   * Card filter tokens (hyphen form, e.g. "serves-returns"). Editorial, never derived from
   * front-matter tags — see HANDOFF "Decisions taken": data-themes is the theme(s) that have
   * their own .theme-filter button and that the session is actually meant to be filed under.
   */
  filterThemes: string[];
  playersDisplay: string;
  courts: number;
  durationMinutes: number;
  /** Card subtitle, e.g. "2-4 players · 1 court · 80 min". */
  cardMeta: string;
}

export type SessionBodyPart =
  | { type: "html"; html: string }
  | { type: "diagram"; drill: number };

export interface SessionBodyBlock {
  /** "drill-block" / "game-block" wrap their parts in the static pages' bordered boxes. */
  wrapper: "drill-block" | "game-block" | null;
  parts: SessionBodyPart[];
}

export interface Session extends SessionSummary {
  /** Diagram JSON keyed by drill number (diagrams/drill-N.json). */
  diagrams: Record<number, CourtDiagramData>;
  blocks: SessionBodyBlock[];
  description: string;
}

// ---------------------------------------------------------------------------
// Theme handling — see HANDOFF "Decisions taken" for why this is load-bearing:
// front-matter `theme:` uses the slash form "serves/returns"; the card filter tokens use the
// hyphen form "serves-returns". Everything else is spelled identically in both places.
// ---------------------------------------------------------------------------

const THEME_TO_FILTER_TOKEN: Record<string, string> = {
  "serves/returns": "serves-returns",
};

/**
 * Per-slug editorial overrides for data-themes, matching the live drills/index.html cards
 * verbatim. Session 1 is deliberately filed under BOTH length and movement (its session theme is
 * length + T-recovery); every other session files under its single primary theme.
 */
const FILTER_THEMES_BY_SLUG: Record<string, string[]> = {
  "session-01-straight-length-and-the-t": ["length", "movement"],
};

function filterThemesFor(slug: string, theme: string): string[] {
  const override = FILTER_THEMES_BY_SLUG[slug];
  if (override) return override;
  return [THEME_TO_FILTER_TOKEN[theme] ?? theme];
}

/** "serves/returns" → "Serves/Returns", "front-court" → "Front-Court". */
function themeDisplay(theme: string): string {
  return theme.replace(/(^|[\s/-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

// ---------------------------------------------------------------------------
// Front-matter parsing
// ---------------------------------------------------------------------------

interface SessionFrontMatter {
  title: string;
  theme: string;
  tags: string[];
  date: string;
  players: string;
  courts: number;
  duration_minutes: number;
}

function listSessionDirs(): string[] {
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^session-\d+-/.test(d.name))
    .map((d) => d.name)
    .sort();
}

function parseSession(slug: string): { data: SessionFrontMatter; content: string } {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, slug, "session.md"), "utf8");
  const parsed = matter(raw);
  return { data: parsed.data as SessionFrontMatter, content: parsed.content };
}

function summarize(slug: string, data: SessionFrontMatter): SessionSummary {
  const number = Number(slug.match(/^session-(\d+)-/)?.[1]);
  const shortTitle = data.title.replace(/^Session\s+\d+\s*—\s*/, "");
  // Front matter: players: "2 (see Coach's notes for 3/4 adaptation)". The base number leads;
  // the parenthetical means the session scales to 3–4 (see CONTENTS-HOWTO.md's shared format).
  const basePlayers = Number(String(data.players).match(/^(\d+)/)?.[1] ?? "2");
  const adaptable = /adaptation/i.test(String(data.players));
  const playersDisplay = adaptable
    ? `${basePlayers} players (3–4 adaptable — see Coach's notes)`
    : `${basePlayers} players`;
  const cardMeta = adaptable
    ? `${basePlayers}-4 players · ${data.courts} court · ${data.duration_minutes} min`
    : `${basePlayers} players · ${data.courts} court · ${data.duration_minutes} min`;
  return {
    slug,
    number,
    title: data.title,
    shortTitle,
    theme: data.theme,
    themeDisplay: themeDisplay(data.theme),
    filterThemes: filterThemesFor(slug, data.theme),
    playersDisplay,
    courts: data.courts,
    durationMinutes: data.duration_minutes,
    cardMeta,
  };
}

/** All sessions, slug-sorted — backs the /drills/ grid and generateStaticParams. */
export function getAllSessions(): SessionSummary[] {
  return listSessionDirs().map((slug) => summarize(slug, parseSession(slug).data));
}

// ---------------------------------------------------------------------------
// Markdown → session body blocks
// ---------------------------------------------------------------------------

// The **Label:** lines that become <dt>/<dd> pairs on the static pages (see any
// drills/session-*/index.html .drill-block dl).
const DL_LABELS = [
  "Setup",
  "Pattern",
  "Coaching points",
  "Success criterion",
  "Regression",
  "Progression",
  "Duration",
  "Condition",
  "Scoring",
  "Rotation",
];

/**
 * The content markdown separates **Label:** lines with single newlines, which CommonMark merges
 * into one paragraph (and swallows trailing labels into the preceding list). Insert a blank line
 * before each label line so marked splits them into separate paragraphs, and turn the
 * "*(Diagram: see `diagrams/drill-N.json`)*" notes into placeholder blocks we split on later.
 */
function preprocessMarkdown(md: string): string {
  let out = md.replace(
    /^\*\(Diagram: see `diagrams\/drill-(\d+)\.json`\)\*$/gm,
    '\n<div data-diagram="$1"></div>\n',
  );
  const labelRe = new RegExp(`(?<!\\n)\\n(\\*\\*(?:${DL_LABELS.join("|")}):\\*\\*)`, "g");
  out = out.replace(labelRe, "\n\n$1");
  return out;
}

function renderMarkdownToHtml(md: string): string {
  let html = marked.parse(preprocessMarkdown(md), { async: false });
  // <p><strong>Label:</strong> rest</p> → <dl><dt>Label</dt><dd>rest</dd></dl>
  html = html.replace(
    /<p><strong>([^:<]+):<\/strong>\s*([\s\S]*?)<\/p>/g,
    (_m, label: string, rest: string) => `<dl><dt>${label}</dt><dd>${rest.trim()}</dd></dl>`,
  );
  // Label-only paragraphs ("Coaching points:") own the <ul> that follows them.
  html = html.replace(/<dd><\/dd><\/dl>\s*(<ul>[\s\S]*?<\/ul>)/g, "<dd>$1</dd></dl>");
  // Merge consecutive one-pair <dl>s back into a single list.
  html = html.replace(/<\/dl>\s*<dl>/g, "");
  // The one table per session is the timeline (class matches the static pages' CSS).
  html = html.replace(/<table>/g, '<table class="timeline-table">');
  // Coach's notes get their .coach-notes wrapper, same as the static pages.
  html = html.replace(
    /(<h2>Coach(?:&#39;|')s notes<\/h2>\s*<ul>[\s\S]*?<\/ul>)/,
    '<div class="coach-notes">$1</div>',
  );
  return html;
}

const DIAGRAM_SLOT_RE = /<div data-diagram="(\d+)"><\/div>/;
const HEADING_RE = /<h([23])>([\s\S]*?)<\/h\1>/;

/**
 * Split the rendered HTML at diagram placeholders, then group the parts so each Drill/Games
 * section (heading through to the next heading, diagrams included) sits inside its
 * .drill-block/.game-block wrapper — matching the static pages' structure.
 */
function buildBlocks(html: string): SessionBodyBlock[] {
  // String.split with a capture group interleaves the captured drill numbers at odd indices.
  const parts: SessionBodyPart[] = [];
  html.split(new RegExp(DIAGRAM_SLOT_RE, "g")).forEach((segment, i) => {
    if (i % 2 === 1) {
      parts.push({ type: "diagram", drill: Number(segment) });
    } else if (segment.trim()) {
      parts.push({ type: "html", html: segment });
    }
  });

  const blocks: SessionBodyBlock[] = [];
  let current: SessionBodyBlock = { wrapper: null, parts: [] };
  const closeCurrent = () => {
    if (current.parts.length > 0) blocks.push(current);
  };

  for (const part of parts) {
    if (part.type === "diagram") {
      current.parts.push(part);
      continue;
    }
    let rest = part.html;
    while (rest.length > 0) {
      const m = rest.match(HEADING_RE);
      if (!m || m.index === undefined) {
        current.parts.push({ type: "html", html: rest });
        break;
      }
      if (m.index > 0) {
        current.parts.push({ type: "html", html: rest.slice(0, m.index) });
      }
      // Any new h2/h3 closes the current wrapper; h3 "Drill …"/"Games …" opens a new one.
      closeCurrent();
      const headingText = m[2].trim();
      const wrapper =
        m[1] === "3" && headingText.startsWith("Drill")
          ? "drill-block"
          : m[1] === "3" && headingText.startsWith("Games")
            ? "game-block"
            : null;
      current = { wrapper, parts: [{ type: "html", html: m[0] }] };
      rest = rest.slice(m.index + m[0].length);
    }
  }
  closeCurrent();
  return blocks;
}

function readDiagrams(slug: string): Record<number, CourtDiagramData> {
  const dir = path.join(CONTENT_DIR, slug, "diagrams");
  const diagrams: Record<number, CourtDiagramData> = {};
  for (const file of fs.readdirSync(dir).sort()) {
    const drill = Number(file.match(/^drill-(\d+)\.json$/)?.[1]);
    if (!Number.isNaN(drill) && drill > 0) {
      diagrams[drill] = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as CourtDiagramData;
    }
  }
  return diagrams;
}

/** One session, fully rendered — backs /drills/[slug]/. */
export function getSession(slug: string): Session {
  const { data, content } = parseSession(slug);
  const summary = summarize(slug, data);
  const themeLine = content.match(/## Session theme\s*\n+([^\n]+)/)?.[1]?.trim();
  return {
    ...summary,
    diagrams: readDiagrams(slug),
    blocks: buildBlocks(renderMarkdownToHtml(content)),
    description: themeLine
      ? `Right Court SC session plan: ${themeLine}`
      : `Right Court SC session plan: ${summary.shortTitle}.`,
  };
}
