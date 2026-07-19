// Port of the static site's loader-demo/index.html — internal QA page for the ball loader's
// tracer patterns. Kept per the migration plan (it's the QA page); noindex like the original.
import type { Metadata } from "next";
import LoaderDemo from "@/components/LoaderDemo";
import "./demo.css";

export const metadata: Metadata = {
  title: "Ball Loader Demo — Right Court SC",
  description:
    "Internal demo of the squash-ball loader's tracer patterns — not linked from site navigation.",
  robots: { index: false },
};

export default function LoaderDemoPage() {
  return (
    <>
      <section className="page-header">
        <h1>Ball Loader Demo</h1>
      </section>
      <LoaderDemo />
    </>
  );
}
