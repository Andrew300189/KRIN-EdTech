"use client";

import { useEffect } from "react";

/**
 * Reveals [data-ao] elements as they enter the viewport.
 * Reads data-ao-delay (integer index) for stagger: each step = 80ms.
 * Uses IntersectionObserver instead of running layout reads for every element
 * on every scroll event. Elements remain visible after their first reveal.
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

    els.forEach(resetHiddenState);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          revealElement(element);
          observer.unobserve(element);
        });
      },
      { threshold: 0.02, rootMargin: "0px 0px -2%" },
    );

    els.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
