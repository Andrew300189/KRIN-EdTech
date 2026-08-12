"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "krin-theme";

function getDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Toggles the visual preference only; authentication and account data stay untouched. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getDocumentTheme());
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = getDocumentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // A private browser context may block storage; the in-page change still works.
    }
  };

  const nextThemeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={nextThemeLabel}
      aria-pressed={theme === "dark"}
      title={nextThemeLabel}
      onClick={toggleTheme}
    >
      <Sun aria-hidden="true" className={styles.sunIcon} size={18} strokeWidth={2} />
      <Moon aria-hidden="true" className={styles.moonIcon} size={17} strokeWidth={2} />
    </button>
  );
}
