"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

type Theme = "dark" | "light";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** A single, accessible place for short action feedback across the platform. */
export function ToastProvider() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return <Toaster position="top-right" theme={theme} richColors closeButton duration={5_500} visibleToasts={3} offset="1rem" />;
}
