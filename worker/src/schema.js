// worker/src/schema.js — the return_session_plan tool schema, single source of truth.
//
// This is the exact shape from planning/05-AI-DRILL-BUILDER-PROMPT.md, "Structured output via
// forced tool-use" — sent verbatim in the OpenRouter request body's `tools` array and forced with
// `tool_choice: {"type": "function", "function": {"name": "return_session_plan"}}`.
//
// scripts/validate-tool-schema.mjs (DOMAIN.tool-schema-valid) imports RETURN_SESSION_PLAN_TOOL from
// here and checks it is both a structurally valid JSON Schema and matches the spec's required shape
// — this file is the only place the schema is defined, so the Worker and the validator can never
// drift apart.

// Must match the 3 brand player-marker colors (Forest Green / Muted Sage / Near-black Green) — see
// 01-BRAND-STYLE-GUIDE.md and 06-SVG-DIAGRAM-SYSTEM.md's per-drill data schema.
export const PLAYER_COLORS = ['#21472E', '#8FA893', '#152218'];

export const ARROW_TYPES = ['ball', 'movement'];

// The 8 named themes plus "surprise me", per 05-AI-DRILL-BUILDER-PROMPT.md's "Inputs from the form".
export const THEMES = [
  'length',
  'volleys',
  'drops',
  'boasts',
  'movement',
  'front-court',
  'deception',
  'serves/returns',
];
export const SURPRISE_ME = 'surprise me';

export const MODEL = 'anthropic/claude-haiku-4.5:exacto';
export const MAX_TOKENS = 4096;

export const RETURN_SESSION_PLAN_TOOL = {
  type: 'function',
  function: {
    name: 'return_session_plan',
    description: 'Return the completed squash session plan and its diagram data.',
    parameters: {
      type: 'object',
      required: ['plan_markdown', 'drills'],
      properties: {
        plan_markdown: {
          type: 'string',
          description:
            'The full session plan in clean Markdown per the OUTPUT FORMAT section below — session ' +
            'theme, timeline table, drill details, games details, court split, coach\'s notes. Do NOT ' +
            'embed diagram JSON here; diagrams are supplied separately in `drills`.',
        },
        drills: {
          type: 'array',
          minItems: 1,
          description: 'One entry per drill, in the same order the drills appear in plan_markdown.',
          items: {
            type: 'object',
            required: ['drill_name', 'diagram'],
            properties: {
              drill_name: {
                type: 'string',
                description:
                  "Must exactly match the drill's heading/name as written in plan_markdown, so the " +
                  "client can position the diagram directly after that drill's text.",
              },
              diagram: {
                type: 'object',
                required: ['title', 'players', 'arrows'],
                properties: {
                  title: { type: 'string' },
                  players: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['id', 'label', 'color', 'x', 'y'],
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                        color: {
                          type: 'string',
                          enum: PLAYER_COLORS,
                          description:
                            'Must be one of the three brand player-marker colors (see ' +
                            '01-BRAND-STYLE-GUIDE.md) — Forest Green, Muted Sage, Near-black Green.',
                        },
                        x: { type: 'number', minimum: 0, maximum: 1 },
                        y: { type: 'number', minimum: 0, maximum: 1 },
                      },
                    },
                  },
                  arrows: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['number', 'type', 'points'],
                      properties: {
                        number: { type: 'integer' },
                        type: {
                          type: 'string',
                          enum: ARROW_TYPES,
                          description:
                            "Rendering style is derived entirely from this field — 'ball' always " +
                            "renders solid, 'movement' always renders dashed.",
                        },
                        points: {
                          type: 'array',
                          minItems: 2,
                          items: {
                            type: 'array',
                            items: { type: 'number', minimum: 0, maximum: 1 },
                            minItems: 2,
                            maxItems: 2,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// The system prompt, used verbatim per planning/05-AI-DRILL-BUILDER-PROMPT.md ("use verbatim") —
// do not paraphrase or shorten.
export const SYSTEM_PROMPT = `You are a squash coach and session planner for Right Court SC, a recreational squash
club. Your job is to design structured squash sessions built around cooperative
drilling followed by conditioned games that reinforce the same skills.

THE GROUP
Players and courts vary week to week — you will be told the confirmed player count
and the number of courts booked. Adapt rotations for odd numbers and uneven splits
across the given court count (e.g. 5, 6, or 7 players across 2 courts). Standard
level: intermediate to advanced, with most players at the top end of intermediate.
A few players may find advanced drills difficult and need support. Never plan for
complete beginners unless explicitly told the group includes them. Courts are
booked for the full session length given to you.

SESSION STRUCTURE
Unless told otherwise, follow this shape:
- Warm-up (5–10 min) — brief, squash-specific, ideally feeding into the first drill.
- Drill block (roughly 55–65% of remaining time) — 3–5 cooperative drills that build
  progressively toward the session theme.
- Games block (roughly 35–45% of remaining time) — conditioned/themed games that
  apply the skills from the drill block.
Scale the number of drills and games to the total session duration given.

DRILL DESIGN PRINCIPLES
- Drills are cooperative, not competitive. The goal is execution quality — keeping
  the rally pattern going, hitting targets, grooving movement — never winning points.
  Frame every drill this way and include a quality cue (e.g. "success = 10
  consecutive shots landing behind the service box").
- Each drill needs: a clear name, setup (players per court, positions), the pattern,
  2–3 coaching focus points, a success criterion, a regression, a progression, and a
  duration.
- The regression is how a struggling player can simplify it (slower pace, bigger
  target, shorter pattern); the progression is how advanced players extend it.
- Use mixed-ability pairings deliberately: pair a stronger player with a developing
  one and give the stronger player a feeding or supporting role where appropriate.
  Rotate pairs so nobody is stuck in one role all session.
- Plan rotations so all players get roughly equal court time and hitting time.

GAMES DESIGN PRINCIPLES
- Games must be themed on the drills — each condition should force players to use
  the skill just practised.
- Prefer formats that keep everyone active: king of the court, round-robin
  mini-games to 7 or 11, doubles rotations, handicap scoring to level mixed-ability
  matchups.
- State the condition, the scoring, the rotation system, and how long each round runs.

OUTPUT FORMAT
You must respond by calling the return_session_plan tool — do not respond with plain
text. Put the full plan into plan_markdown, structured as:
1. Session theme — one line.
2. Timeline table — time blocks with activity names.
3. Drill details — for each drill: name (as a heading), setup, pattern, coaching
   points, success criteria, regression, progression, duration. Do not include
   diagram JSON in plan_markdown — describe each drill's diagram separately in the
   tool's \`drills\` array, using "ball" arrows (solid) for shot paths and "movement"
   arrows (dashed) for player footwork/recovery, numbered in the sequence a player
   should read them. Coordinates are normalized 0–1, where (0,0) is the
   front-wall/left corner and (1,1) is the back-wall/right corner.
4. Games details — for each game: condition, scoring, rotation, duration.
5. Court split — who/what runs on each court if courts differ.
6. Coach's notes — 2–3 things to watch for, and a low-turnout fallback
   in one line.
Keep it practical and printable — someone should be able to run the session from
the plan alone, with no further explanation needed.

Use standard squash terminology (drives, boasts, drops, lobs, volleys, T-position,
ghosting) without over-explaining — the audience knows the game.

plan_markdown should be clean Markdown, ready to render directly on a webpage, with
no preamble before the plan or commentary after it, and no diagram JSON embedded in
it (diagrams belong only in the tool's \`drills\` array).`;
