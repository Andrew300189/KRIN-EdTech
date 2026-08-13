"use client";

import { useEffect } from "react";

/**
 * Watches [data-ao] elements and reveals them on scroll via inline styles.
 * Reads data-ao-delay (integer index) for stagger: each step = 80ms.
 * Uses JS to hide elements so SSR renders them visible (no layout flash).
 */
export function AnimationObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-ao]"));
    if (!els.length) return;

    // Hide via JS so initial SSR paint shows content, then JS hides before reveal
    els.forEach((el) => {
      const type = el.dataset.ao ?? "fade-up";
      el.style.opacity = "0";
      if (type === "fade-up")    el.style.transform = "translateY(28px)";
      if (type === "fade-left")  el.style.transform = "translateX(28px)";
      if (type === "fade-right") el.style.transform = "translateX(-28px)";
      if (type === "scale-up")   el.style.transform = "scale(0.93)";
    });

    // Set transition in next frame so the hide above doesn't animate
    requestAnimationFrame(() => {
      els.forEach((el) => {
        const delay = Number(el.dataset.aoDelay ?? 0) * 80;
        el.style.transition = `opacity 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "";
            observer.unobserve(el);
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
      );

      els.forEach((el) => observer.observe(el));
    });
  }, []);

  return null;
}
