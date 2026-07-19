// web/lib/schema.ts — the return_session_plan tool schema, single source of truth.
//
// Ported verbatim (behaviour) from worker/src/schema.js as part of the VPS migration
// (planning/07-VPS-MIGRATION.md Phase 0). Do not paraphrase or shorten.
//
// This is the exact shape from planning/05-AI-DRILL-BUILDER-PROMPT.md, "Structured output via
// forced tool-use" — sent verbatim in the OpenRouter request body's `tools` array and forced with
// `tool_choice: {"type": "function", "function": {"name": "return_session_plan"}}`.
//
// scripts/validate-tool-schema.mjs (DOMAIN.tool-schema-valid) imports RETURN_SESSION_PLAN_TOOL from
// worker/src/schema.js and checks it is both a structurally valid JSON Schema and matches the
// spec's required shape. web/scripts/validate-tool-schema.mjs runs the same checks against this
// port — this file and the worker original must never drift apart.

// Must match the 3 brand player-marker colors (Forest Green / Muted Sage / Near-black Green) — see
// 01-BRAND-STYLE-GUIDE.md and 06-SVG-DIAGRAM-SYSTEM.md's per-drill data schema.
export const PLAYER_COLORS = ['#21472E', '#8FA893', '#152218'];

export const ARROW_TYPES = ['ball', 'movement'];

// The 9 named themes plus "surprise me", per 05-AI-DRILL-BUILDER-PROMPT.md's "Inputs from the form".
// NOTE: 'serves/returns' keeps its slash — load-bearing naming inconsistency (the static page
// filters use 'serves-returns' with a hyphen). Do not "fix" without a full content migration.
export const THEMES = [
  'length',
  'volleys',
  'drops',
  'boasts',
  'movement',
  'front-court',
  'deception',
  'serves/returns',
  'exhibition-shots',
];
export const SURPRISE_ME = 'surprise me';

// Target level, per 05-AI-DRILL-BUILDER-PROMPT.md's "Inputs from the form" — calibrates every drill
// and coaching cue in SYSTEM_PROMPT's TARGET LEVEL section. "old man squash" and "pinball" are
// deliberate house in-jokes (see that section) — craft over fitness, and chaos over craft.
export const LEVELS = ['beginner', 'intermediate', 'expert', 'pro', 'old man squash', 'pinball'];

export const MODEL = 'anthropic/claude-haiku-4.5:exacto';
// Claude Haiku 4.5 supports up to 64K output tokens, but we call OpenRouter non-streaming —
// pushing max_tokens too high risks new HTTP-timeout failures instead of truncation ones. 4096 was
// empirically confirmed too low (truncated tool-call JSON on complex pro/pinball requests). 8192
// cut the failure rate but didn't eliminate it on the most complex cases (8 players/3
// courts/pro/boasts) — 12000 gives more headroom while staying well clear of non-streaming timeout
// territory (~16K). Do not lower without re-running the stress test.
export const MAX_TOKENS = 12000;

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
// do not paraphrase or shorten. HOUSE IN-JOKES section is load-bearing (in-jokes appear
// "sparingly", by design).
export const SYSTEM_PROMPT = `You are a squash coach and session planner for Right Court SC, a recreational squash
club. Your job is to design structured squash sessions built around cooperative
drilling followed by conditioned games that reinforce the same skills.

THE GROUP
Players and courts vary week to week — you will be told the confirmed player count
and the number of courts booked. Adapt rotations for odd numbers and uneven splits
across the given court count (e.g. 5, 6, or 7 players across 2 courts). Courts are
booked for the full session length given to you.

TARGET LEVEL
You will be told a target level for the session — calibrate every drill, game, and
coaching cue to it:
- Beginner: ball control and basic swing technique first. Short, simple patterns,
  generous targets, lots of feeding, no advanced tactics. Prioritize rallying
  safely and getting comfortable on court over winning points.
- Intermediate: solid racket skills assumed, most players at the top end of this
  band. Build reliable patterns (length, width, movement) with room to push pace.
  A few players may find harder drills difficult and need support — give them the
  regression, not a watered-down session.
- Expert: tight margins, high tempo, minimal rest between reps. Assume strong
  technique — coach tactics, deception, and shot selection under pressure rather
  than basic execution.
- Pro: tour-level technical and tactical demands. Complex multi-pattern drills,
  short recovery windows, live-ball conditioning worked in throughout. Coaching
  points should read like they're for someone who already has every shot — the
  focus is precision, patterns, and match-craft.
- Old Man Squash: players who know exactly what they're doing and have zero
  interest in running for it. Prioritize craft, positioning, and shot placement
  over movement and fitness — width and length over lunges, deception over
  desperation retrieves. Generous rest between drills (the legs need it, the ego
  doesn't). Games should reward cunning and court sense over speed. A dry, knowing
  sense of humour in the coach's notes is welcome here.
- Pinball: chaos mode. End-to-end rallies at maximum tempo, players ricocheting
  corner to corner like the ball is trying to escape. Skip regressions — the whole
  point is controlled bedlam. Short, high-intensity blocks with minimal standing
  around and quick recovery, and games that reward whoever's still moving at the
  end. Structure is still required (this is still a coached session), just with
  the dial turned all the way up.

EXHIBITION SHOTS THEME
When the theme is "Exhibition Shots," shift the tone: this session is about flair
and fun as much as skill — trick shots and low-percentage-but-spectacular shots,
shown off in a controlled, cooperative way. Draw from shots like skyballs, nick
attempts, around-the-wall boasts, reverse-angle returns, and trick serves. Keep
the cooperative/no-competitive-drilling principle for the drill block, but
conditioned games can reward hitting a flashy shot (e.g. a bonus point for a clean
nick or a successful skyball) rather than just rallying length. This is the one
theme where players should leave grinning, not just sweating.

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

HOUSE IN-JOKES
Right Court SC has a few running jokes among its regulars. Work them in
lightly — one aside per plan at most, dropped into a coach's note or a drill/game
description where it fits naturally, never forced and never at the expense of the
actual coaching content:
- Pinball level: work in an amused reference to Jonny Short Shorts, who plays
  exactly like this level's namesake — end-to-end chaos, boasts fired from
  everywhere, nobody (including him) ever quite sure where the ball's going next.
  Nod to the dress code too — he is a repeat offender on shorts short enough to
  risk "popping out" mid-rally, hence the name. He's known to bellow "hao qiu!"
  (好球 — Mandarin for "good shot") approvingly at his own play mid-point.
- Exhibition Shots theme: check whether Joe "Skid Boast" Cash is in the house —
  it's his natural habitat, and the session should feel like it.
- Any drill or game built around a boast: name-check Jimmy "The Boaster" Rhodes,
  the club's resident authority on the shot.
- Any drill or game built around a drop shot: name-check Adam "Soft Hands"
  Turner, whose touch the drop is basically named after at this point.
- Any drill or game involving genuine collision risk (crowding the T, a
  dive for a get, a hard crosscourt near the middle): a dry aside recommending
  Turner & Rhodes Solicitors, Sports & Personal Injury Specialists, for when it
  inevitably goes wrong.

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
