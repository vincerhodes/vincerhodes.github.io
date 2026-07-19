"use client";

// Client half of /saved-drills/ (Phase 4 of planning/07-VPS-MIGRATION.md). Fetches this
// browser's saved drills from GET /api/drills/ with the X-Visitor-Token header (see
// web/lib/visitor.ts), renders each plan with the same PlanResultView the drill builder uses,
// and deletes via DELETE /api/drills/[id] (with a confirm — there's no undo).
import { useEffect, useState } from "react";
import Link from "next/link";
import PlanResultView, { type PlanResult } from "@/components/PlanResultView";
import { getVisitorToken } from "@/lib/visitor";

interface SavedDrill {
  id: string;
  title: string;
  /** Session-plan JSON string ({ plan_markdown, drills }). */
  payload: string;
  created_at: number;
}

type LoadState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; drills: SavedDrill[] };

function formatSavedAt(createdAt: number): string {
  return new Date(createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SavedDrillsList() {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDrills(): Promise<{ drills: SavedDrill[] }> {
      const token = getVisitorToken();
      if (!token) throw new Error("No visitor token available");
      const response = await fetch("/api/drills/", {
        headers: { "X-Visitor-Token": token },
      });
      if (!response.ok) throw new Error(`List failed (${response.status})`);
      return response.json();
    }

    loadDrills()
      .then((body) => {
        if (!cancelled) setLoad({ state: "ready", drills: body.drills || [] });
      })
      .catch((err) => {
        console.error("Loading saved drills failed:", err);
        if (!cancelled) setLoad({ state: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const remove = (drill: SavedDrill) => {
    if (!window.confirm(`Delete "${drill.title}"? There's no getting it back.`)) return;

    const token = getVisitorToken();
    if (!token) {
      setDeleteError("Couldn't read this browser's visitor token.");
      return;
    }

    setDeletingId(drill.id);
    setDeleteError(null);
    fetch(`/api/drills/${encodeURIComponent(drill.id)}/`, {
      method: "DELETE",
      headers: { "X-Visitor-Token": token },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Delete failed (${response.status})`);
        if (load.state === "ready") {
          setLoad({
            state: "ready",
            drills: load.drills.filter((d) => d.id !== drill.id),
          });
        }
        if (expandedId === drill.id) setExpandedId(null);
      })
      .catch((err) => {
        console.error("Deleting saved drill failed:", err);
        setDeleteError(`Couldn't delete "${drill.title}" — try again.`);
      })
      .finally(() => {
        setDeletingId(null);
      });
  };

  if (load.state === "loading") {
    return <p className="saved-drills-status">Digging through the kit bag…</p>;
  }

  if (load.state === "error") {
    return (
      <p className="saved-drills-status" data-state="error">
        Couldn&rsquo;t load your saved drills — refresh and try again.
      </p>
    );
  }

  if (load.drills.length === 0) {
    return (
      <div className="saved-drills-empty">
        <p>
          Nothing saved yet — the cupboard&rsquo;s as bare as court two on a bank holiday. When
          the <Link href="/drill-builder/">Drill Builder</Link> serves up a plan worth keeping,
          hit <strong>Save this drill</strong> and it&rsquo;ll live here.
        </p>
        <p>
          Saved drills stay in this browser, so no — the committee can&rsquo;t see what
          you&rsquo;ve been planning.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="saved-drills-note">
        These plans live in this browser only. Delete one and it&rsquo;s gone — like a drop shot
        that dies in the nick, there&rsquo;s no retrieving it.
      </p>
      {deleteError && (
        <p className="saved-drills-status" data-state="error">
          {deleteError}
        </p>
      )}
      <ul className="saved-drills-list">
        {load.drills.map((drill) => {
          const expanded = expandedId === drill.id;
          let plan: PlanResult | null = null;
          if (expanded) {
            try {
              plan = JSON.parse(drill.payload) as PlanResult;
            } catch {
              plan = null;
            }
          }
          return (
            <li key={drill.id} className="saved-drill">
              <div className="saved-drill-header">
                <div>
                  <h2>{drill.title}</h2>
                  <p className="saved-drill-meta">Saved {formatSavedAt(drill.created_at)}</p>
                </div>
                <div className="saved-drill-actions">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : drill.id)}
                  >
                    {expanded ? "Hide plan" : "View plan"}
                  </button>
                  <button
                    type="button"
                    className="saved-drill-delete"
                    disabled={deletingId === drill.id}
                    onClick={() => remove(drill)}
                  >
                    {deletingId === drill.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="saved-drill-plan">
                  {plan ? (
                    <PlanResultView plan={plan} idPrefix={`saved-${drill.id}`} />
                  ) : (
                    <p className="saved-drills-status" data-state="error">
                      Couldn&rsquo;t read this plan&rsquo;s details — the title and date above are
                      all that survived.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
