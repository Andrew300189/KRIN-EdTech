/** @jest-environment jsdom */

import { createElement } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { FlowerCollection } from "@/modules/motivation/components/FlowerCollection";

describe("FlowerCollection", () => {
  it("shows opened flowers, hides undiscovered names and filters the album", () => {
    window.localStorage.setItem("krin.locale", "en");
    render(createElement(LocaleProvider, null, createElement(FlowerCollection, {
      initialCollection: {
        discovered: 1, total: 2, opened: 2,
        flowers: [
          { id: "chamomile", names: { en: "Chamomile", ru: "Ромашка" }, rarity: "COMMON", naturalRarityRank: 1, count: 2, firstFoundAt: "2026-09-01T10:00:00.000Z", lastFoundAt: "2026-09-02T10:00:00.000Z" },
          { id: "white-lily", names: { en: "White lily", ru: "Белая лилия" }, rarity: "LEGENDARY", naturalRarityRank: 5, count: 0, firstFoundAt: null, lastFoundAt: null },
        ],
      },
    })));

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chamomile/ })).toHaveTextContent("×2");
    expect(screen.queryByText("White lily")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discovered", pressed: false }));
    expect(screen.getByRole("button", { name: /Chamomile/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mystery flower/ })).not.toBeInTheDocument();
  });
});
