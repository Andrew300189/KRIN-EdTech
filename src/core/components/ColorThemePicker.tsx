"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./ColorThemePicker.module.css";

type ColorTheme = "violet" | "ocean" | "sunset";

const STORAGE_KEY = "krin-color-theme";
const options: Array<{ id: ColorTheme; label: string; swatch: string }> = [
  { id: "violet", label: "Violet", swatch: "#5a4af4" },
  { id: "ocean", label: "Ocean", swatch: "#087f8c" },
  { id: "sunset", label: "Sunset", swatch: "#d15b13" },
];

function currentColorTheme(): ColorTheme {
  const current = document.documentElement.dataset.colorTheme;
  return current === "ocean" || current === "sunset" ? current : "violet";
}

/** A compact, shared palette switcher. It changes semantic colour tokens, so
 * the same choice works across public pages, learner pages and dark mode. */
export function ColorThemePicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ColorTheme>("violet");

  useEffect(() => setSelected(currentColorTheme()), []);

  function selectTheme(theme: ColorTheme) {
    document.documentElement.dataset.colorTheme = theme;
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
      {options.map((option) => <button
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
