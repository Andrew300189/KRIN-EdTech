"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function FaqAccordion({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) return;
      if (!target.open) return;

      root.querySelectorAll("details").forEach((detail) => {
        if (detail !== target) {
          detail.open = false;
        }
      });
    };

    const allDetails = root.querySelectorAll("details");
    allDetails.forEach((detail) => detail.addEventListener("toggle", handleToggle));

    return () => {
      allDetails.forEach((detail) =>
        detail.removeEventListener("toggle", handleToggle),
      );
    };
  }, []);

  return <div ref={rootRef} className={className}>{children}</div>;
}
