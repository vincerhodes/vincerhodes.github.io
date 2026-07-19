"use client";

// Port of js/counters.js — animated stat counters (home page) and the interactive
// timeline (about page). Effect-only component: the markup is server-rendered by the
// pages with the same end-state attributes main.js/counters.js used to set via JS
// (final counter values in the spans, first timeline item active); this adds the
// animation and interaction on top, exactly like the source scripts.
import { usePathname } from "next/navigation";
import { useEffect } from "react";

function formatValue(value: number, el: HTMLElement): string {
  const prefix = el.getAttribute("data-prefix") || "";
  const suffix = el.getAttribute("data-suffix") || "";
  const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
  const rounded =
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-GB");
  return prefix + rounded + suffix;
}

export default function TrCounters() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    /* ---- Animated stat counters ---- */
    function animateCounter(el: HTMLElement) {
      const target = parseFloat(el.getAttribute("data-target") || "");
      if (isNaN(target)) return;

      if (reduceMotion) {
        el.textContent = formatValue(target, el);
        return;
      }

      const duration = 1600;
      let start: number | null = null;
      let raf = 0;

      const step = (timestamp: number) => {
        if (start === null) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatValue(target * eased, el);
        if (progress < 1) raf = window.requestAnimationFrame(step);
      };

      raf = window.requestAnimationFrame(step);
      cleanups.push(() => window.cancelAnimationFrame(raf));
    }

    const stats = Array.from(
      document.querySelectorAll<HTMLElement>(".tr-site .stat__value[data-target]")
    );
    let statsObserver: IntersectionObserver | null = null;
    if (stats.length) {
      if (!("IntersectionObserver" in window)) {
        stats.forEach(animateCounter);
      } else {
        statsObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                animateCounter(entry.target as HTMLElement);
                statsObserver!.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.4 }
        );
        stats.forEach((el) => statsObserver!.observe(el));
      }
    }

    /* ---- Interactive timeline (About page) ---- */
    const timelineItems = Array.from(
      document.querySelectorAll<HTMLElement>(".tr-site .timeline__item")
    );
    timelineItems.forEach((item) => {
      const activate = () => {
        timelineItems.forEach((other) => {
          const isThis = other === item;
          const otherBody = other.querySelector(".timeline__body");
          other.classList.toggle("is-active", isThis);
          other.setAttribute("aria-expanded", String(isThis));
          if (otherBody) otherBody.setAttribute("aria-hidden", String(!isThis));
        });
      };
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      };
      item.addEventListener("click", activate);
      item.addEventListener("keydown", onKeydown);
      cleanups.push(() => {
        item.removeEventListener("click", activate);
        item.removeEventListener("keydown", onKeydown);
      });
    });

    return () => {
      statsObserver?.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [pathname]);

  return null;
}
