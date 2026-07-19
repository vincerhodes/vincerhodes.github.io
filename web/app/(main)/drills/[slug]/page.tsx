// Dynamic SSG port of the static drills/session-*/index.html pages. The markdown body comes
// from content/sessions/<slug>/session.md (inside web/, rendered to the static pages' structure by
// @/lib/sessions) and the court diagrams from diagrams/drill-N.json, rendered by
// @/components/CourtDiagram — the React port of assets/js/court-diagram.js.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import CourtDiagram from "@/components/CourtDiagram";
import { getAllSessions, getSession } from "@/lib/sessions";
import "./session.css";

export function generateStaticParams() {
  return getAllSessions().map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = getSession(slug);
  return {
    title: `${session.title} — Right Court SC`,
    description: session.description,
  };
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getAllSessions().some((s) => s.slug === slug)) notFound();
  const session = getSession(slug);

  return (
    <>
      <section className="page-header">
        <h1>{session.title}</h1>
      </section>

      <main className="session-content">
        <p className="session-meta">
          <span>Theme: {session.themeDisplay}</span>
          <span>{session.playersDisplay}</span>
          <span>
            {session.courts} court{session.courts === 1 ? "" : "s"}
          </span>
          <span>{session.durationMinutes} minutes</span>
        </p>

        {session.blocks.map((block, i) => {
          const parts = block.parts.map((part, j) =>
            part.type === "html" ? (
              // HTML is built at build time from our own content/sessions markdown — trusted.
              <div key={j} dangerouslySetInnerHTML={{ __html: part.html }} />
            ) : (
              <CourtDiagram
                key={j}
                data={session.diagrams[part.drill]}
                idPrefix={`court-diagram-${slug}-drill-${part.drill}`}
              />
            ),
          );
          return block.wrapper ? (
            <div key={i} className={block.wrapper}>
              {parts}
            </div>
          ) : (
            <Fragment key={i}>{parts}</Fragment>
          );
        })}
      </main>
    </>
  );
}
