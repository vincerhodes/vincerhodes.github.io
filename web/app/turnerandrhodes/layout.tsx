import type { Metadata } from "next";
// Turner & Rhodes design system, scoped under .tr-site (see the header comment in
// tr-style.css for how it was transformed from the source repo's css/). fonts.css has
// only its font URLs rewritten to web/public/turnerandrhodes/fonts/.
import "./tr-fonts.css";
import "./tr-style.css";
import TrHeader from "@/components/tr/TrHeader";
import TrFooter from "@/components/tr/TrFooter";
import TrEffects from "@/components/tr/TrEffects";

export const metadata: Metadata = {
  title: "Turner & Rhodes Solicitors | Sports & Personal Injury Specialists, London",
  description:
    "Turner & Rhodes Solicitors — City of London specialists in sports injury, squash and racquetball court claims, and personal liability matters, handled with discretion.",
  icons: { icon: { url: "/turnerandrhodes/favicon.svg", type: "image/svg+xml" } },
};

// Theme boot — runs before first paint, exactly like the source site's inline `js` class
// script plus the theme init in js/main.js (localStorage "tr-theme", else system
// preference, defaulting to Chambers Dark). Sets data-theme on <html>; all scoped T&R
// CSS keys off html[data-theme].
const THEME_BOOT = `(function(){var d=document.documentElement;d.classList.add("js");var t=null;try{t=localStorage.getItem("tr-theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.setAttribute("data-theme",t);})();`;

export default function TurnerRhodesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      {/* Same-origin font preloads, as in the source pages' <head>. */}
      <link
        rel="preload"
        href="/turnerandrhodes/fonts/playfair-display-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/turnerandrhodes/fonts/inter-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <div className="tr-site">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <TrHeader />
        {children}
        <TrFooter />
      </div>
      <TrEffects />
    </>
  );
}
