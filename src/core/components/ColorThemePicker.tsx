"use client";

import { Palette } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { applyColorTheme, COLOR_THEME_CHANGE_EVENT, COLOR_THEME_STORAGE_KEY, COLOR_THEMES, resolveColorTheme, type ColorTheme } from "@/core/color-themes";
import { useLocale } from "@/core/i18n/locale";
import styles from "./ColorThemePicker.module.css";

function currentColorTheme(): ColorTheme {
  return resolveColorTheme(document.documentElement.dataset.colorTheme).id;
}

/** One palette control for the dashboard, lessons and the public site. */
export function ColorThemePicker() {
  const { locale } = useLocale();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ColorTheme>("violet");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const title = locale === "uk" ? "Кольори сайту" : locale === "ru" ? "Цвета сайта" : "Site colours";
  const action = locale === "uk" ? "Змінити кольори сайту" : locale === "ru" ? "Изменить цвета сайта" : "Change site colours";

  useEffect(() => {
    const sync = () => setSelected(currentColorTheme());
    sync();
    window.addEventListener(COLOR_THEME_CHANGE_EVENT, sync);
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== COLOR_THEME_STORAGE_KEY) return;
      const theme = resolveColorTheme(event.newValue);
      document.documentElement.dataset.colorTheme = theme.id;
      document.documentElement.style.setProperty("--palette-primary", theme.swatch);
      sync();
    };
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(COLOR_THEME_CHANGE_EVENT, sync);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const placeMenu = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(208, window.innerWidth - 16);
    const height = Math.min(window.innerHeight * .7, 400);
    setPosition({
      top: Math.max(8, Math.min(rect.bottom + 7, window.innerHeight - height - 8)),
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, placeMenu]);

  function selectTheme(theme: ColorTheme) {
    applyColorTheme(theme);
    setSelected(theme);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return <div className={styles.root}>
    <button
      ref={triggerRef}
      type="button"
      className={styles.trigger}
      aria-label={action}
      aria-expanded={open}
      aria-haspopup="menu"
      title={action}
      onClick={() => { placeMenu(); setOpen((value) => !value); }}
    >
      <Palette size={18} aria-hidden="true" />
    </button>
    {open ? createPortal(<div ref={menuRef} className={styles.menu} role="menu" aria-label={title} style={position}>
      <p>{title}</p>
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
    </div>, document.body) : null}
  </div>;
}
