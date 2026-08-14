"use client";

import { useEffect } from "react";

/**
 * Watches [data-ao] elements and reveals them on scroll via inline styles.
 * Reads data-ao-delay (integer index) for stagger: each step = 80ms.
 * Uses JS to hide elements so SSR renders them visible (no layout flash).
 * Replays the animation every time the element leaves and re-enters the viewport.
 */
export function AnimationObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-ao]"));
    if (!els.length) return;

    const resetHiddenState = (el: HTMLElement) => {
      const type = el.dataset.ao ?? "fade-up";
      const step = Number(el.dataset.aoDelay ?? 0);
      el.style.opacity = "0";
      if (type === "fade-up")    el.style.transform = "translateY(28px)";
      if (type === "fade-left")  el.style.transform = "translateX(28px)";
      if (type === "fade-right") el.style.transform = "translateX(-28px)";
      if (type === "scale-up")   el.style.transform = "scale(0.93)";
      if (type === "stair") {
        el.style.transform = `translate(${18 + step * 8}px, ${14 + step * 8}px) scale(0.96)`;
      }
      el.dataset.aoActive = "false";
    };

    const revealElement = (el: HTMLElement) => {
      const delay = Number(el.dataset.aoDelay ?? 0) * 80;
      el.style.transition = `opacity 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        if (el.dataset.ao === "stair") {
          el.style.transform = "translate(0, 0) scale(1)";
          return;
        }
        el.style.transform = "";
      });
      el.dataset.aoActive = "true";
    };

    const updateVisibility = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < viewportHeight && rect.bottom > 0;
        const delay = Number(el.dataset.aoDelay ?? 0) * 80;
        el.style.transition = `opacity 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;

        if (inViewport) {
          if (el.dataset.aoActive !== "true") {
            revealElement(el);
          }
          return;
        }

        if (el.dataset.aoActive === "true") {
          resetHiddenState(el);
        }
      });
    };

    els.forEach((el) => {
      resetHiddenState(el);
    });

    updateVisibility();

    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return null;
}
