/** @jest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ColorThemePicker } from "@/core/components/ColorThemePicker";
import { COLOR_THEMES, COLOR_THEME_STORAGE_KEY } from "@/core/color-themes";
import { LocaleProvider } from "@/core/i18n/locale";

describe("shared site palette controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("krin-locale-preference", "en");
    document.documentElement.dataset.colorTheme = "violet";
    document.documentElement.style.setProperty("--palette-primary", COLOR_THEMES[0].swatch);
  });

  it("offers every colour, works outside clipped cards and synchronizes both buttons", () => {
    render(createElement(LocaleProvider, null,
      createElement("div", { style: { overflow: "hidden" } }, createElement(ColorThemePicker)),
      createElement(ColorThemePicker),
    ));
    const triggers = screen.getAllByRole("button", { name: "Change site colours" });
    fireEvent.click(triggers[0]);
    expect(screen.getByRole("menu", { name: "Site colours" }).parentElement).toBe(document.body);
    expect(within(screen.getByRole("menu")).getAllByRole("menuitemradio")).toHaveLength(20);

    for (const theme of COLOR_THEMES) {
      const menu = screen.getByRole("menu");
      fireEvent.click(within(menu).getByRole("menuitemradio", { name: theme.label }));
      expect(document.documentElement).toHaveAttribute("data-color-theme", theme.id);
      expect(document.documentElement.style.getPropertyValue("--palette-primary")).toBe(theme.swatch);
      expect(window.localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe(theme.id);
      fireEvent.click(triggers[1]);
      expect(within(screen.getByRole("menu")).getByRole("menuitemradio", { name: theme.label })).toHaveAttribute("aria-checked", "true");
      fireEvent.click(triggers[1]);
      fireEvent.click(triggers[0]);
    }
  });
});
