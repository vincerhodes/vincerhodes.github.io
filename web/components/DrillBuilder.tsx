"use client";

// React port of the static site's assets/js/drill-builder.js form logic (Phase 3 of
// planning/07-VPS-MIGRATION.md), shared between /drill-builder/ (standalone page) and /drills/
// (embedded section), same as the original. Keeps the original DOM ids/classes so
// web/app/drill-builder.css applies unchanged, keeps the loading-quip/pattern rotation, and
// keeps the client-side Save/download flow. The plan rendering itself (markdown + diagrams)
// lives in @/components/PlanResultView, shared with /saved-drills/; the markdown renderer is in
// @/lib/markdown. Phase 4 added the "Save this drill" flow: the plan POSTs to same-origin
// /api/drills/ with the browser's X-Visitor-Token. Fetches same-origin /api/generate — the
// api.rightcourtsc.com CORS dance is gone post-cutover.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BallLoader, { randomPattern, type BallLoaderPattern } from "@/components/BallLoader";
import PlanResultView, { type PlanResult } from "@/components/PlanResultView";
import { LEVELS, SURPRISE_ME, THEMES } from "@/lib/schema";
import { getVisitorToken } from "@/lib/visitor";
import { FOUNDERS, SAVER_NAME_KEY } from "@/lib/founders";

// Select labels, matching the static forms' option text exactly (values come from schema.ts —
// the single source of truth — labels are display-only).
const THEME_LABELS: Record<string, string> = {
  length: "Length",
  volleys: "Volleys",
  drops: "Drops",
  boasts: "Boasts",
  movement: "Movement",
  "front-court": "Front-court",
  deception: "Deception",
  "serves/returns": "Serves/returns",
  "exhibition-shots": "Exhibition Shots",
  [SURPRISE_ME]: "Surprise me",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
  pro: "Pro",
  "old man squash": "Old Man Squash",
  pinball: "Pinball",
};

// --- Loading status ----------------------------------------------------------------------------
// Same quips as drill-builder.js: long generations bore a single fixed loop to death, so the
// status quip and tracer pattern re-roll every 6 seconds while loading.
const LOADING_QUIPS = [
  "Warming up the robot coach…",
  "Lining up the diagrams…",
  "Arguing about who takes the T…",
  "Chalking the tin…",
];
const LOADING_INTERVAL_MS = 6000;

type Status =
  | { state: "loading"; message: string; theme?: string; pattern?: BallLoaderPattern }
  | { state: "error" };

function apiUrl(): string {
  // Matches drill-builder.js's window.DRILL_BUILDER_API_BASE override hook (used by the e2e
  // harness); the production default is now same-origin.
  const w = window as unknown as { DRILL_BUILDER_API_BASE?: string };
  return w.DRILL_BUILDER_API_BASE || "/api/generate/";
}

// --- Save this drill (Phase 4) ------------------------------------------------------------------
// Persists the generated plan to the shared club library via /api/drills/. The browser's visitor
// token goes along for the ride (it gates deletes); saved_by names one of the four founders.
type SaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved" }
  | { state: "error"; message: string };

function defaultSaveTitle(theme: string): string {
  const label = THEME_LABELS[theme] ?? theme ?? "Session plan";
  return `${label} — ${new Date().toISOString().slice(0, 10)}`;
}

// --- Save to library (client-side packaging only, no extra API call) ---------------------------
function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadTextFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DrillBuilder() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  // Form values at submit time — the Save flow builds front matter / filenames from them.
  const [submitted, setSubmitted] = useState<{ theme: string; level: string } | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  // Preselected with the name this browser saved under last time. The dropdown only renders
  // after a plan is generated (never in the SSR HTML), so a lazy localStorage read can't cause
  // a hydration mismatch.
  const [saverName, setSaverName] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const remembered = window.localStorage.getItem(SAVER_NAME_KEY);
      return remembered && (FOUNDERS as readonly string[]).includes(remembered) ? remembered : "";
    } catch {
      // localStorage unavailable (private mode etc.) — the dropdown just starts blank.
      return "";
    }
  });
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle" });
  const loadingTimerRef = useRef<number | null>(null);

  const stopLoadingRotation = () => {
    if (loadingTimerRef.current !== null) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  useEffect(() => stopLoadingRotation, []);

  const startLoading = (theme: string) => {
    stopLoadingRotation();
    // Initial loader uses the theme's tracer pattern, same as RCBallLoader.markup(message, theme).
    setStatus({
      state: "loading",
      message: "Generating your session plan… complex plans can take a little while.",
      theme,
    });
    let quipIndex = -1;
    loadingTimerRef.current = window.setInterval(() => {
      quipIndex = (quipIndex + 1) % LOADING_QUIPS.length;
      setStatus({
        state: "loading",
        message: LOADING_QUIPS[quipIndex],
        pattern: randomPattern(),
      });
    }, LOADING_INTERVAL_MS);
  };

  const generate = () => {
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
      players: parseInt(String(formData.get("players")), 10),
      courts: parseInt(String(formData.get("courts")), 10),
      theme: String(formData.get("theme") || ""),
      level: String(formData.get("level") || ""),
      duration_minutes: parseInt(String(formData.get("duration_minutes")), 10),
      notes: String(formData.get("notes") || "").trim(),
    };

    setSubmitting(true);
    setPlan(null);
    startLoading(payload.theme);

    fetch(apiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) =>
        response.json().then((body) => {
          if (!response.ok) {
            throw new Error((body && body.error) || "Generation failed");
          }
          return body as PlanResult;
        })
      )
      .then((data) => {
        stopLoadingRotation();
        setStatus(null);
        setSubmitted({ theme: payload.theme, level: payload.level });
        setPlan(data);
        setSaveTitle(defaultSaveTitle(payload.theme));
        setSaveState({ state: "idle" });
      })
      .catch((err) => {
        // Error contract per 03-TECHNICAL-ARCHITECTURE.md: on total failure, show a plain
        // message with a retry button — never a stack trace or raw error to the user. The real
        // error still goes to the console so a report of "it failed" is diagnosable.
        if (window.console && console.error) {
          console.error("Drill builder generation failed:", err);
        }
        stopLoadingRotation();
        setStatus({ state: "error" });
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const savePlan = () => {
    if (!plan) return;

    if (!saverName) {
      setSaveState({
        state: "error",
        message: "pick your name first — the library needs to know who saved it",
      });
      return;
    }

    const token = getVisitorToken();
    if (!token) {
      setSaveState({
        state: "error",
        message: "this browser won't let us store a visitor token (check localStorage settings)",
      });
      return;
    }

    setSaveState({ state: "saving" });
    fetch("/api/drills/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Visitor-Token": token },
      body: JSON.stringify({ title: saveTitle, payload: plan, saved_by: saverName }),
    })
      .then((response) =>
        response.json().then((body) => {
          if (!response.ok) {
            throw new Error((body && body.error) || `Save failed (${response.status})`);
          }
          try {
            window.localStorage.setItem(SAVER_NAME_KEY, saverName);
          } catch {
            // Remembering the name is a nicety — a failed write doesn't affect the save.
          }
          setSaveState({ state: "saved" });
        })
      )
      .catch((err) => {
        if (window.console && console.error) {
          console.error("Saving drill failed:", err);
        }
        setSaveState({
          state: "error",
          message: err instanceof Error ? err.message : "something went sideways",
        });
      });
  };

  const frontMatter = submitted
    ? "---\n" +
      `theme: ${submitted.theme}\n` +
      `level: ${submitted.level}\n` +
      `date: ${new Date().toISOString().slice(0, 10)}\n` +
      `tags: [${submitted.theme}]\n` +
      `title: session-XX-${slugify(submitted.theme || "session")}\n` +
      "---\n\n"
    : "";

  return (
    <>
      <form
        className="builder-form"
        id="builder-form"
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          generate();
        }}
      >
        <div className="field">
          <label htmlFor="field-players">Players</label>
          <input
            type="number"
            id="field-players"
            name="players"
            min={1}
            step={1}
            defaultValue={6}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="field-courts">Courts booked</label>
          <input
            type="number"
            id="field-courts"
            name="courts"
            min={1}
            step={1}
            defaultValue={2}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="field-theme">Theme</label>
          <select id="field-theme" name="theme" required defaultValue={THEMES[0]}>
            {[...THEMES, SURPRISE_ME].map((theme) => (
              <option key={theme} value={theme}>
                {THEME_LABELS[theme] ?? theme}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="field-level">Target level</label>
          <select id="field-level" name="level" required defaultValue="intermediate">
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level] ?? level}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="field-duration">Session length (minutes)</label>
          <input
            type="number"
            id="field-duration"
            name="duration_minutes"
            min={15}
            step={5}
            defaultValue={120}
            required
          />
        </div>

        <div className="field field-full">
          <label htmlFor="field-notes">Notes (optional)</label>
          <textarea
            id="field-notes"
            name="notes"
            placeholder="e.g. two beginners joining, low turnout, someone's carrying an injury"
          />
        </div>

        <button className="builder-submit" type="submit" id="builder-submit" disabled={submitting}>
          Generate session plan
        </button>
      </form>

      <p
        className="builder-status"
        id="builder-status"
        hidden={status === null}
        data-state={status?.state}
      >
        {status?.state === "loading" && (
          <BallLoader message={status.message} theme={status.theme} pattern={status.pattern} />
        )}
        {status?.state === "error" && (
          <>
            Couldn&rsquo;t generate a plan — try again.
            <button type="button" className="builder-retry" onClick={generate}>
              Retry
            </button>
          </>
        )}
      </p>

      <div id="plan-result" hidden={plan === null}>
        {plan && (
          <>
            <PlanResultView plan={plan} idPrefix="plan-drill" />

            <div className="save-drill" id="save-drill">
              <h2>Save this drill</h2>
              <p>
                Keep this plan on hand for Wednesday — it goes in the club&rsquo;s shared drill
                library (no account, no sign-up), and you can find it any time under{" "}
                <Link href="/saved-drills/">The Drill Library</Link>.
              </p>
              <div className="save-drill-row">
                <label className="sr-only" htmlFor="save-drill-name">
                  Your name
                </label>
                <select
                  id="save-drill-name"
                  value={saverName}
                  onChange={(event) => {
                    setSaverName(event.target.value);
                    if (saveState.state !== "saving") setSaveState({ state: "idle" });
                  }}
                  disabled={saveState.state === "saving"}
                >
                  <option value="" disabled>
                    Pick your name…
                  </option>
                  {FOUNDERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="save-drill-title">
                  Title for this saved drill
                </label>
                <input
                  type="text"
                  id="save-drill-title"
                  maxLength={200}
                  value={saveTitle}
                  onChange={(event) => {
                    setSaveTitle(event.target.value);
                    if (saveState.state !== "saving") setSaveState({ state: "idle" });
                  }}
                  disabled={saveState.state === "saving"}
                />
                <button
                  type="button"
                  id="save-drill-submit"
                  onClick={savePlan}
                  disabled={saveState.state === "saving" || saveTitle.trim().length === 0}
                >
                  {saveState.state === "saving" ? "Saving…" : "Save this drill"}
                </button>
              </div>
              {saveState.state === "saved" && (
                <p className="save-drill-note" data-state="saved">
                  Saved. It&rsquo;s waiting in{" "}
                  <Link href="/saved-drills/">The Drill Library</Link>.
                </p>
              )}
              {saveState.state === "error" && (
                <p className="save-drill-note" data-state="error">
                  Couldn&rsquo;t save — {saveState.message}
                </p>
              )}
            </div>

            <div className="save-plan">
              <h2>Save this session plan</h2>
              <p>
                Like this one? Grab the files below and hand them to a committee member to add to{" "}
                <code>web/content/sessions/</code> — see{" "}
                <a href="https://github.com/vincerhodes/rightcourtsc/blob/main/CONTENTS-HOWTO.md">
                  CONTENTS-HOWTO.md
                </a>{" "}
                for the exact layout. Everything&rsquo;s packaged client-side, so this won&rsquo;t
                call the API again — no extra cost for admiring your own handiwork.
              </p>
              <div id="save-plan-buttons">
                <button
                  type="button"
                  onClick={() => downloadTextFile("session.md", frontMatter + plan.plan_markdown)}
                >
                  Download session.md
                </button>
                {(plan.drills || []).map((drill, index) =>
                  drill.diagram ? (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `drill-${index + 1}.json`,
                          JSON.stringify(drill.diagram, null, 2)
                        )
                      }
                    >
                      Download diagrams/drill-{index + 1}.json
                    </button>
                  ) : null
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
