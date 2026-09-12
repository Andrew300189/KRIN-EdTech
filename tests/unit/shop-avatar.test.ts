import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";

describe("shop avatar details", () => {
  it("provides the same visual metadata for each supported shop avatar", () => {
    expect(shopAvatarDetails("avatar-fox")).toEqual({ glyph: "🦊", label: "Fox avatar" });
    expect(shopAvatarDetails("avatar-owl")).toEqual({ glyph: "🦉", label: "Owl avatar" });
  });

  it("does not render an unknown or absent shop item as an avatar", () => {
    expect(shopAvatarDetails(null)).toBeNull();
    expect(shopAvatarDetails("theme-aurora")).toBeNull();
  });
});
