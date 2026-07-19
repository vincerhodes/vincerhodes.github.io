// /saved-drills/ — The Drill Library: every session plan the club has saved from the Drill
// Builder. The shell is static; the drills are fetched client-side from the public
// /api/drills/ (see @/components/SavedDrillsList). URL kept as /saved-drills/ for existing links.
import type { Metadata } from "next";
import SavedDrillsList from "@/components/SavedDrillsList";
import "./saved-drills.css";

export const metadata: Metadata = {
  title: "The Drill Library — Right Court SC",
  description:
    "Session plans worth keeping, saved by the club from the Right Court SC AI Drill Builder.",
};

export default function SavedDrillsPage() {
  return (
    <>
      <section className="page-header">
        <h1>The Drill Library</h1>
        <p>Session plans worth keeping, saved by the club.</p>
      </section>

      <main className="builder-content">
        <SavedDrillsList />
      </main>
    </>
  );
}
