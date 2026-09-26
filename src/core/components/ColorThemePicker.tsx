"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { COLOR_THEMES, type ColorTheme } from "@/core/color-themes";
import styles from "./ColorThemePicker.module.css";

const STORAGE_KEY = "krin-color-theme";

function currentColorTheme(): ColorTheme {
  const current = document.documentElement.dataset.colorTheme;
  return COLOR_THEMES.find((option) => option.id === current)?.id ?? "violet";
}

/** A compact, shared palette switcher. It changes semantic colour tokens, so
 * the same choice works across public pages, learner pages and dark mode. */
export function ColorThemePicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ColorTheme>("violet");

  useEffect(() => setSelected(currentColorTheme()), []);

  function selectTheme(theme: ColorTheme) {
    document.documentElement.dataset.colorTheme = theme;
    document.documentElement.style.setProperty("--palette-primary", COLOR_THEMES.find((option) => option.id === theme)?.swatch ?? COLOR_THEMES[0].swatch);
    setSelected(theme);
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage is optional. The selected palette remains active in this tab.
    }
  }

  return <div className={styles.root}>
    <button
      type="button"
      className={styles.trigger}
      aria-label="Change site colours"
      aria-expanded={open}
      aria-haspopup="menu"
      title="Change site colours"
      onClick={() => setOpen((value) => !value)}
    >
      <Palette size={18} aria-hidden="true" />
    </button>
    {open ? <div className={styles.menu} role="menu" aria-label="Site colours">
      <p>Site colours</p>
      {COLOR_THEMES.map((option) => <button
        key={option.id}
        type="button"
        role="menuitemradio"
        aria-checked={selected === option.id}
        className={selected === option.id ? styles.optionActive : styles.option}
        onClick={() => selectTheme(option.id)}
      >
        <span className={styles.swatch} style={{ backgroundColor: option.swatch }} aria-hidden="true" />
        {option.label}
      </button>)}
    </div> : null}
  </div>;
}
