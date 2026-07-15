// worker/src/index.js — the Cloudflare Worker fetch handler for the AI Drill Builder.
// Architecture: planning/03-TECHNICAL-ARCHITECTURE.md "AI Drill Builder — Worker architecture".
// Prompt/tool schema: planning/05-AI-DRILL-BUILDER-PROMPT.md.
//
// Pure logic (validation, clamping, drill_name matching, rate-limit decisions) lives in
// worker/src/lib.js so it can be unit-tested directly (DOMAIN.worker-unit-tests) without a live
// Workers runtime. This file wires that logic to the actual fetch/KV/OpenRouter I/O.

import { MAX_TOKENS, MODEL, RETURN_SESSION_PLAN_TOOL, SYSTEM_PROMPT } from './schema.js';
import {
  applyRateLimit,
  buildUserMessage,
  corsHeaders,
  filterValidDiagrams,
  validateRequestBody,
} from './lib.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message, status, headers) {
  return jsonResponse({ error: message }, status, headers);
}

/**
 * Test-mode stub — used only when env.TEST_MODE === 'true'. Real API calls don't belong in a check
 * that reruns on every loop iteration (see planning/00-master-plan.md Phase 4, E2E.drill-builder-
 * flow). Produces a response shaped exactly like a real forced-tool-use OpenRouter reply so the
 * rest of the pipeline (clamping, drill_name matching, client rendering) is exercised for real.
 */
function stubGeneration(body) {
  const drillName = `Stub Drill: ${body.theme} focus`;
  const plan_markdown = [
    `# Session theme`,
    ``,
    `${body.theme} — a stubbed plan generated in TEST_MODE for ${body.players} players on ` +
      `${body.courts} court(s), ${body.duration_minutes} minutes.`,
    ``,
    `## ${drillName}`,
    ``,
    `Setup: stub setup text. Pattern: stub pattern text.`,
    ``,
    `## Coach's notes`,
    ``,
    `Stub notes.${body.notes ? ` Additional notes received: ${body.notes}` : ''}`,
  ].join('\n');

  return {
    plan_markdown,
    drills: [
      {
        drill_name: drillName,
        diagram: {
          title: drillName,
          players: [
            { id: 'A', label: 'Feeder', color: '#8FA893', x: 0.3, y: 0.5 },
            { id: 'B', label: 'Hitter', color: '#21472E', x: 0.3, y: 0.85 },
          ],
          arrows: [{ number: 1, type: 'ball', points: [[0.3, 0.5], [0.3, 0.85]] }],
        },
      },
    ],
  };
}

/** Calls OpenRouter with forced tool-use and returns { plan_markdown, drills }. Throws on any failure. */
async function callOpenRouter(body, env) {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('Worker is not configured (missing OPENROUTER_API_KEY)');
  }

  const userMessage = buildUserMessage(body);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      tools: [RETURN_SESSION_PLAN_TOOL],
      tool_choice: { type: 'function', function: { name: 'return_session_plan' } },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status})`);
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function?.name !== 'return_session_plan') {
    throw new Error('OpenRouter response did not include the forced tool call');
  }

  let args;
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error('OpenRouter tool call arguments were not valid JSON');
  }

  if (typeof args.plan_markdown !== 'string' || !Array.isArray(args.drills)) {
    throw new Error('OpenRouter tool call arguments did not match the expected shape');
  }

  return { plan_markdown: args.plan_markdown, drills: args.drills };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const extraAllowed = env.EXTRA_ALLOWED_ORIGIN ? [env.EXTRA_ALLOWED_ORIGIN] : [];
    const headers = corsHeaders(origin, extraAllowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/generate') {
      return errorResponse('Not found', 404, headers);
    }
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Request body must be valid JSON', 400, headers);
    }

    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return errorResponse(`Invalid request: ${validation.errors.join('; ')}`, 400, headers);
    }

    if (env.RATE_LIMIT) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const decision = await applyRateLimit(env.RATE_LIMIT, ip);
      if (!decision.allowed) {
        return errorResponse('Rate limit exceeded (30 generations/hour) — try again later.', 429, headers);
      }
    }

    let generated;
    try {
      generated = env.TEST_MODE === 'true' ? stubGeneration(body) : await callOpenRouter(body, env);
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Generation failed', 502, headers);
    }

    const { drills } = filterValidDiagrams(generated.drills, generated.plan_markdown);

    return jsonResponse({ plan_markdown: generated.plan_markdown, drills }, 200, headers);
  },
};
