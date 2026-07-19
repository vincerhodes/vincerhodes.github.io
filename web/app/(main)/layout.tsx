import type { Metadata } from "next";
// Design system ported verbatim from the static site's assets/css/ (Phase 0 scaffold).
// styles.css @imports the Lora webfont from Google Fonts, same as the live site.
// These imports moved here from the root layout in Phase 5 so the main-site CSS only
// loads on main-site routes — Turner & Rhodes has its own scoped design system.
import "./styles.css";
import "./ball-loader.css";
import "./drill-builder.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Right Court SC",
  description: "Right Court SC — recreational squash club",
  icons: { icon: "/favicon.png" },
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
