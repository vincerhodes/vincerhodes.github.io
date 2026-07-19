// Port of the static site's drill-builder/index.html (Phase 3 of planning/07-VPS-MIGRATION.md).
// The form/status/result interactivity lives in @/components/DrillBuilder (shared with the
// embedded builder section on /drills/); page-scoped styles are in app/drill-builder.css,
// imported globally by the root layout.
import type { Metadata } from "next";
import Link from "next/link";
import DrillBuilder from "@/components/DrillBuilder";

export const metadata: Metadata = {
  title: "AI Drill Builder — Right Court SC",
  description:
    "Generate a fresh Right Court SC session plan in seconds, tailored to who's showing up tonight.",
};

export default function DrillBuilderPage() {
  return (
    <>
      <section className="page-header">
        <h1>AI Drill Builder</h1>
      </section>

      <main className="builder-content">
        <p>
          Tell it who&rsquo;s showing up and what you want to work on. Out comes a full session
          plan, diagrams and all, built on the same coaching brain behind every plan in the{" "}
          <Link href="/drills/">Drills &amp; Sessions library</Link> — just without the wait.
        </p>

        <DrillBuilder />
      </main>
    </>
  );
}
