// /saved-drills/ (Phase 4 of planning/07-VPS-MIGRATION.md) — lists the drills this browser has
// saved via the Drill Builder. The shell is static; the drills themselves are per-browser and
// fetched client-side from /api/drills/ (see @/components/SavedDrillsList).
import type { Metadata } from "next";
import SavedDrillsList from "@/components/SavedDrillsList";
import "./saved-drills.css";

export const metadata: Metadata = {
  title: "Saved Drills — Right Court SC",
  description:
    "The session plans this browser has saved from the Right Court SC AI Drill Builder.",
};

export default function SavedDrillsPage() {
  return (
    <>
      <section className="page-header">
        <h1>Saved Drills</h1>
      </section>

      <main className="builder-content">
        <SavedDrillsList />
      </main>
    </>
  );
}
