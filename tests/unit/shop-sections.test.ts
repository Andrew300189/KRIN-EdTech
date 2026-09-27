/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createElement } from "react";
import { LocaleProvider } from "@/core/i18n/locale";
import { ShopPage } from "@/app/(student)/student/shop/ShopPage";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe("shop sections", () => {
  it("shows every purchase under its own category instead of hiding items behind filters", async () => {
    const kinds = ["recovery", "booster", "avatar", "theme", "discount"] as const;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {
      balance: 25, equippedTheme: null, equippedAvatar: null, coupons: [],
      items: kinds.map((kind) => ({ id: `test-${kind}`, kind, price: 1, title: `Test ${kind}`, description: `${kind} item`, owned: false, quantity: 0 })),
    } }) }) as never;

    render(createElement(LocaleProvider, null, createElement(ShopPage)));

    for (const kind of kinds) {
      const heading = await screen.findByRole("heading", { name: { recovery: "Water Lilies and recovery", booster: "XP boosts", avatar: "Avatars", theme: "Site palettes", discount: "Discounts" }[kind] });
      expect(heading.closest("section")).toHaveAttribute("id", `shop-${kind}`);
      expect(screen.getByRole("heading", { name: `Test ${kind}` })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Buy" })).toHaveLength(kinds.length);
  });
});
