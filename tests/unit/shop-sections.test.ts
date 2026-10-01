/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createElement } from "react";
import { LocaleProvider } from "@/core/i18n/locale";
import { ShopPage } from "@/app/(student)/student/shop/ShopPage";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe("shop sections", () => {
  afterEach(() => { window.history.replaceState({}, "", "/"); });

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

  it("keeps purchased scene postcards in a readable collection", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {
      balance: 4, equippedTheme: null, equippedAvatar: null, coupons: [],
      items: [{ id: "postcard-market", kind: "collectible", price: 1, title: "At the market", description: "I need a bag of rice.", owned: true, quantity: 0 }],
    } }) }) as never;
    render(createElement(LocaleProvider, null, createElement(ShopPage)));
    const album = await screen.findByRole("region", { name: "My scene album" });
    fireEvent.click(screen.getByRole("button", { name: "Open: At the market" }));
    expect(album).toBeInTheDocument();
    expect(screen.getAllByText("I need a bag of rice.")).toHaveLength(2);
  });

  it("highlights the suitable lily purchase, then the return to the same lesson", async () => {
    window.history.replaceState({}, "", "/student/shop?returnTo=%2Fuk%2Fcourses%2Fbag%2Flessons%2Ffirst&streak=12");
    Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: () => "test-purchase-id" });
    let owned = 0;
    global.fetch = jest.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") owned += 1;
      return { ok: true, json: async () => ({ data: options?.method === "POST" ? { purchased: true } : {
        balance: 10, equippedTheme: null, equippedAvatar: null, coupons: [],
        items: [
          { id: "water-lily", kind: "recovery", price: .1, title: "Water Lily 10", description: "", owned: owned > 0, quantity: owned, value: 10 },
          { id: "water-lily-25", kind: "recovery", price: .25, title: "Water Lily 25", description: "", owned: false, quantity: 0, value: 25 },
        ],
      } }) };
    }) as never;
    render(createElement(LocaleProvider, null, createElement(ShopPage)));
    const buy = await screen.findByRole("button", { name: "Buy: Water Lily · ×10" });
    expect(buy).toHaveAttribute("data-recovery-step", "purchase");
    fireEvent.click(buy);
    fireEvent.click(buy);
    await waitFor(() => expect(owned).toBe(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Buy: Water Lily · ×10" })).toHaveAttribute("data-recovery-step", "purchase"));
    fireEvent.click(screen.getByRole("button", { name: "Buy: Water Lily · ×10" }));
    const returnLink = await screen.findByRole("link", { name: "Return to lesson" });
    expect(returnLink).toHaveAttribute("href", "/uk/courses/bag/lessons/first");
    expect(returnLink).toHaveAttribute("data-recovery-step", "return");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Buy: Water Lily · ×10" })).not.toBeInTheDocument());
  });

  it("offers the lesson return when the highlighted lily is unaffordable", async () => {
    window.history.replaceState({}, "", "/student/shop?returnTo=%2Fuk%2Fcourses%2Fbag%2Flessons%2Ffirst&streak=12");
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {
      balance: 0, equippedTheme: null, equippedAvatar: null, coupons: [],
      items: [{ id: "water-lily", kind: "recovery", price: .1, title: "Water Lily 10", description: "", owned: false, quantity: 0, value: 10 }],
    } }) }) as never;
    render(createElement(LocaleProvider, null, createElement(ShopPage)));
    expect(await screen.findByRole("link", { name: "Return to lesson" })).toHaveAttribute("data-recovery-step", "return");
    expect(screen.queryByRole("button", { name: /Buy: Water Lily/ })).not.toBeInTheDocument();
  });
});
