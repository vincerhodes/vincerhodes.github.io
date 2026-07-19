"use client";

// Shared rendering for a generated session plan ({ plan_markdown, drills }) — the markdown body
// plus one CourtDiagram per drill. Used by DrillBuilder (freshly generated plan) and the
// saved-drills page (a plan reloaded from SQLite), so both render identically. The markdown
// renderer HTML-escapes everything the model returned before adding its own tags.
import CourtDiagram from "@/components/CourtDiagram";
import { renderMarkdown } from "@/lib/markdown";
import type { Drill } from "@/lib/generate";
import type { CourtDiagramData } from "@/lib/sessions";

export interface PlanResult {
  plan_markdown: string;
  drills: Drill[];
}

export default function PlanResultView({
  plan,
  idPrefix = "plan-drill",
}: {
  plan: PlanResult;
  idPrefix?: string;
}) {
  return (
    <>
      {/* renderMarkdown HTML-escapes the model's output before adding its own tags. */}
      <div
        className="plan-markdown"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.plan_markdown) }}
      />
      <div className="plan-diagrams">
        {(plan.drills || []).map((drill, index) => (
          <div key={index} className="drill-diagram-slot" data-drill-index={String(index)}>
            {drill.diagram ? (
              <CourtDiagram
                data={drill.diagram as unknown as CourtDiagramData}
                idPrefix={`${idPrefix}-${index}`}
              />
            ) : (
              // Graceful degrade per 06-SVG-DIAGRAM-SYSTEM.md "Validation" — the plan text
              // above is unaffected, no error to the user.
              <p className="diagram-unavailable">
                Diagram unavailable for &quot;{drill.drill_name || "this drill"}&quot; — the plan
                text above is unaffected.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
