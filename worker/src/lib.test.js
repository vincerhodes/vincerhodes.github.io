// worker/src/lib.test.js — DOMAIN.worker-unit-tests (`npx vitest run worker/`).
//
// Covers, per planning/00-master-plan.md Phase 4:
//   - coordinate clamping to [0,1]
//   - drill_name matching
//   - request validation (rejects missing players/courts/theme/duration_minutes)
//   - the KV rate-limit counter logic (mocked KV, not the unit under test)

import { describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_MAX,
  applyRateLimit,
  buildUserMessage,
  clamp01,
  clampDiagram,
  computeRateLimitDecision,
  corsHeaders,
  drillNameMatchesPlan,
  filterValidDiagrams,
  isAllowedOrigin,
  validateRequestBody,
} from './lib.js';

// A minimal in-memory stand-in for the Cloudflare KV binding interface used by applyRateLimit
// (get/put only). This mocks the *dependency* (KV), not the rate-limit logic itself — the unit
// under test (computeRateLimitDecision / applyRateLimit) runs for real against this fake store.
function createMockKv() {
  const store = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    _store: store,
  };
}

describe('clamp01', () => {
  it('passes through values already inside [0,1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
  });

  it('clamps values below 0 up to 0', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it('clamps values above 1 down to 1', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(999)).toBe(1);
  });

  it('clamps non-finite / non-numeric input to 0', () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(undefined)).toBe(0);
    expect(clamp01('not a number')).toBe(0);
  });
});

describe('clampDiagram', () => {
  it('clamps every player x/y and every arrow point in place', () => {
    const diagram = {
      title: 'Test',
      players: [{ id: 'A', label: 'A', color: '#21472E', x: -0.2, y: 1.4 }],
      arrows: [{ number: 1, type: 'ball', points: [[-1, 2], [0.5, 0.5]] }],
    };

    const clamped = clampDiagram(diagram);

    expect(clamped.players[0].x).toBe(0);
    expect(clamped.players[0].y).toBe(1);
    expect(clamped.arrows[0].points).toEqual([[0, 1], [0.5, 0.5]]);
  });

  it('does not mutate the input diagram', () => {
    const diagram = {
      title: 'Test',
      players: [{ id: 'A', label: 'A', color: '#21472E', x: -0.2, y: 0.5 }],
      arrows: [],
    };
    clampDiagram(diagram);
    expect(diagram.players[0].x).toBe(-0.2);
  });

  it('leaves already in-range values untouched', () => {
    const diagram = {
      title: 'Test',
      players: [{ id: 'A', label: 'A', color: '#21472E', x: 0.3, y: 0.6 }],
      arrows: [{ number: 1, type: 'movement', points: [[0.1, 0.2], [0.3, 0.4]] }],
    };
    const clamped = clampDiagram(diagram);
    expect(clamped.players[0]).toEqual(diagram.players[0]);
    expect(clamped.arrows[0].points).toEqual([[0.1, 0.2], [0.3, 0.4]]);
  });
});

describe('drillNameMatchesPlan', () => {
  const plan = [
    '# Session theme',
    '',
    'Length — building a reliable straight rail.',
    '',
    '## Drill 1: Straight Rail Drives',
    '',
    'Setup text.',
    '',
    '### Games 1: King of the Court',
  ].join('\n');

  it('matches a drill_name that equals a heading exactly', () => {
    expect(drillNameMatchesPlan('Drill 1: Straight Rail Drives', plan)).toBe(true);
  });

  it('matches case-insensitively and ignoring markdown emphasis markers', () => {
    expect(drillNameMatchesPlan('drill 1: straight rail drives', plan)).toBe(true);
    expect(drillNameMatchesPlan('**Drill 1: Straight Rail Drives**', plan)).toBe(true);
  });

  it('matches headings at any level (## or ###)', () => {
    expect(drillNameMatchesPlan('Games 1: King of the Court', plan)).toBe(true);
  });

  it('returns false when no heading matches', () => {
    expect(drillNameMatchesPlan('Drill 9: Does Not Exist', plan)).toBe(false);
  });

  it('returns false for empty/missing input', () => {
    expect(drillNameMatchesPlan('', plan)).toBe(false);
    expect(drillNameMatchesPlan('Drill 1: Straight Rail Drives', '')).toBe(false);
    expect(drillNameMatchesPlan(undefined, plan)).toBe(false);
  });
});

describe('filterValidDiagrams', () => {
  const plan = '# Theme\n\n## Drill 1: Real Drill\n\nSetup.';
  const goodDiagram = {
    title: 'Drill 1: Real Drill',
    players: [{ id: 'A', label: 'A', color: '#21472E', x: 0.5, y: 0.5 }],
    arrows: [{ number: 1, type: 'ball', points: [[0.1, 0.1], [0.2, 0.2]] }],
  };

  it('keeps a drill whose name matches a heading and has a well-formed diagram', () => {
    const { drills, degraded, total } = filterValidDiagrams(
      [{ drill_name: 'Drill 1: Real Drill', diagram: goodDiagram }],
      plan
    );
    expect(total).toBe(1);
    expect(degraded).toBe(0);
    expect(drills[0].diagram).not.toBeNull();
  });

  it('degrades (drops the diagram, keeps drill_name) when drill_name has no matching heading', () => {
    const { drills, degraded } = filterValidDiagrams(
      [{ drill_name: 'Drill 9: Fictional', diagram: goodDiagram }],
      plan
    );
    expect(degraded).toBe(1);
    expect(drills[0].diagram).toBeNull();
    expect(drills[0].drill_name).toBe('Drill 9: Fictional');
  });

  it('degrades when the diagram is structurally empty (no players or no arrows)', () => {
    const { drills, degraded } = filterValidDiagrams(
      [{ drill_name: 'Drill 1: Real Drill', diagram: { title: 't', players: [], arrows: [] } }],
      plan
    );
    expect(degraded).toBe(1);
    expect(drills[0].diagram).toBeNull();
  });

  it('clamps out-of-range coordinates on drills it keeps', () => {
    const offRangeDiagram = {
      ...goodDiagram,
      players: [{ id: 'A', label: 'A', color: '#21472E', x: 5, y: -5 }],
    };
    const { drills } = filterValidDiagrams(
      [{ drill_name: 'Drill 1: Real Drill', diagram: offRangeDiagram }],
      plan
    );
    expect(drills[0].diagram.players[0].x).toBe(1);
    expect(drills[0].diagram.players[0].y).toBe(0);
  });

  it('handles an empty drills array', () => {
    expect(filterValidDiagrams([], plan)).toEqual({ drills: [], total: 0, degraded: 0 });
  });
});

describe('validateRequestBody', () => {
  const valid = { players: 6, courts: 2, theme: 'length', duration_minutes: 120, notes: '' };

  it('accepts a fully valid request', () => {
    expect(validateRequestBody(valid)).toEqual({ valid: true, errors: [] });
  });

  it('accepts theme "surprise me"', () => {
    expect(validateRequestBody({ ...valid, theme: 'surprise me' }).valid).toBe(true);
  });

  it('rejects a request missing players', () => {
    const { players, ...rest } = valid;
    const result = validateRequestBody(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('players'))).toBe(true);
  });

  it('rejects a request missing courts', () => {
    const { courts, ...rest } = valid;
    const result = validateRequestBody(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('courts'))).toBe(true);
  });

  it('rejects a request missing theme', () => {
    const { theme, ...rest } = valid;
    const result = validateRequestBody(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('theme'))).toBe(true);
  });

  it('rejects a request missing duration_minutes', () => {
    const { duration_minutes, ...rest } = valid;
    const result = validateRequestBody(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duration_minutes'))).toBe(true);
  });

  it('rejects a request with an unrecognized theme', () => {
    const result = validateRequestBody({ ...valid, theme: 'not-a-real-theme' });
    expect(result.valid).toBe(false);
  });

  it('rejects non-integer players/courts and non-positive duration', () => {
    expect(validateRequestBody({ ...valid, players: 5.5 }).valid).toBe(false);
    expect(validateRequestBody({ ...valid, courts: 0 }).valid).toBe(false);
    expect(validateRequestBody({ ...valid, duration_minutes: 0 }).valid).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(validateRequestBody(null).valid).toBe(false);
    expect(validateRequestBody('nope').valid).toBe(false);
  });
});

describe('buildUserMessage', () => {
  it('interpolates all five form fields', () => {
    const msg = buildUserMessage({
      players: 6,
      courts: 2,
      theme: 'length',
      duration_minutes: 120,
      notes: 'wet weather',
    });
    expect(msg).toContain('Confirmed players: 6');
    expect(msg).toContain('Courts booked: 2');
    expect(msg).toContain('Theme: length');
    expect(msg).toContain('Session length: 120 minutes');
    expect(msg).toContain('Additional notes: wet weather');
  });

  it('uses "none" when notes is empty/missing', () => {
    const msg = buildUserMessage({ players: 6, courts: 2, theme: 'length', duration_minutes: 120 });
    expect(msg).toContain('Additional notes: none');
  });

  it('appends the surprise-me instruction only when theme is "surprise me"', () => {
    const surpriseMsg = buildUserMessage({
      players: 6,
      courts: 2,
      theme: 'surprise me',
      duration_minutes: 120,
    });
    expect(surpriseMsg).toContain('Pick a theme not commonly repeated week-to-week');

    const namedMsg = buildUserMessage({
      players: 6,
      courts: 2,
      theme: 'length',
      duration_minutes: 120,
    });
    expect(namedMsg).not.toContain('Pick a theme not commonly repeated week-to-week');
  });
});

describe('computeRateLimitDecision (pure)', () => {
  it('allows and starts a fresh window when there is no existing record', () => {
    const now = 1_000_000;
    const decision = computeRateLimitDecision(null, now);
    expect(decision.allowed).toBe(true);
    expect(decision.record.count).toBe(1);
    expect(decision.record.resetAt).toBeGreaterThan(now);
  });

  it('increments count while under the cap within the window', () => {
    const now = 1_000_000;
    const record = { count: 5, resetAt: now + 10_000 };
    const decision = computeRateLimitDecision(record, now);
    expect(decision.allowed).toBe(true);
    expect(decision.record.count).toBe(6);
    expect(decision.record.resetAt).toBe(record.resetAt);
  });

  it(`blocks once count reaches ${RATE_LIMIT_MAX} within the window`, () => {
    const now = 1_000_000;
    const record = { count: RATE_LIMIT_MAX, resetAt: now + 10_000 };
    const decision = computeRateLimitDecision(record, now);
    expect(decision.allowed).toBe(false);
    expect(decision.record.count).toBe(RATE_LIMIT_MAX);
  });

  it('resets the window (allows again) once resetAt has passed', () => {
    const now = 2_000_000;
    const record = { count: RATE_LIMIT_MAX, resetAt: now - 1 };
    const decision = computeRateLimitDecision(record, now);
    expect(decision.allowed).toBe(true);
    expect(decision.record.count).toBe(1);
    expect(decision.record.resetAt).toBeGreaterThan(now);
  });
});

describe('applyRateLimit (against a mocked KV)', () => {
  it('allows the first 30 requests from an IP within an hour and blocks the 31st', async () => {
    const kv = createMockKv();
    const now = 1_700_000_000_000;

    for (let i = 1; i <= RATE_LIMIT_MAX; i += 1) {
      const decision = await applyRateLimit(kv, '203.0.113.5', now + i);
      expect(decision.allowed).toBe(true);
      expect(decision.record.count).toBe(i);
    }

    const blocked = await applyRateLimit(kv, '203.0.113.5', now + RATE_LIMIT_MAX + 1);
    expect(blocked.allowed).toBe(false);
  });

  it('tracks separate IPs independently', async () => {
    const kv = createMockKv();
    const now = Date.now();

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await applyRateLimit(kv, '10.0.0.1', now);
    }
    const otherIp = await applyRateLimit(kv, '10.0.0.2', now);
    expect(otherIp.allowed).toBe(true);
    expect(otherIp.record.count).toBe(1);
  });

  it('allows again after the window has elapsed', async () => {
    const kv = createMockKv();
    const start = 1_700_000_000_000;

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await applyRateLimit(kv, '198.51.100.9', start);
    }
    expect((await applyRateLimit(kv, '198.51.100.9', start)).allowed).toBe(false);

    const oneHourFiveMinLater = start + 65 * 60 * 1000;
    const decision = await applyRateLimit(kv, '198.51.100.9', oneHourFiveMinLater);
    expect(decision.allowed).toBe(true);
    expect(decision.record.count).toBe(1);
  });
});

describe('CORS', () => {
  it('allows the two production origins', () => {
    expect(isAllowedOrigin('https://rightcourtsc.com')).toBe(true);
    expect(isAllowedOrigin('https://vincerhodes.github.io')).toBe(true);
  });

  it('rejects an arbitrary origin by default', () => {
    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
  });

  it('allows an extra origin only when explicitly passed (e.g. dev/test server)', () => {
    expect(isAllowedOrigin('http://localhost:4173', ['http://localhost:4173'])).toBe(true);
    expect(isAllowedOrigin('http://localhost:4173')).toBe(false);
  });

  it('corsHeaders omits Access-Control-Allow-Origin for a disallowed origin', () => {
    const headers = corsHeaders('https://evil.example.com');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('corsHeaders echoes the origin back when allowed', () => {
    const headers = corsHeaders('https://rightcourtsc.com');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://rightcourtsc.com');
  });
});
