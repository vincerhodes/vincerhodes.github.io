"use client";

// Port of the scroll-reveal and hero-parallax halves of js/main.js. Renders nothing;
// runs the same IntersectionObserver / rAF-throttled scroll logic against the DOM the
// server components rendered, re-initialising on every in-section navigation.
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function TrEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- Scroll reveal ---- */
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".tr-site .reveal:not(.is-visible)")
    );
    let observer: IntersectionObserver | null = null;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
    } else if (items.length) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer!.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      items.forEach((el, i) => {
        el.style.setProperty("--i", String(i % 6));
        observer!.observe(el);
      });
    }

    /* ---- Hero parallax ---- */
    let onScroll: (() => void) | null = null;
    if (!reduceMotion) {
      const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
      if (layers.length) {
        let ticking = false;
        const update = () => {
          const y = window.scrollY;
          layers.forEach((layer) => {
            const speed = parseFloat(layer.getAttribute("data-parallax") || "0.15");
            layer.style.transform = `translate3d(0, ${y * speed}px, 0)`;
          });
          ticking = false;
        };
        onScroll = () => {
          if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
      }
    }

    return () => {
      observer?.disconnect();
      if (onScroll) window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}
