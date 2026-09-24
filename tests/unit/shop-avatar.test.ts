import { existsSync } from "node:fs";
import { join } from "node:path";
import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";
import { PURCHASABLE_AVATARS } from "@/modules/motivation/utils/shop-avatar-catalog";

describe("shop avatar details", () => {
  it("provides the same visual metadata for each supported shop avatar", () => {
    expect(shopAvatarDetails("avatar-fox")).toEqual({ glyph: "🦊", label: "Fox avatar" });
    expect(shopAvatarDetails("avatar-owl")).toEqual({ glyph: "🦉", label: "Owl avatar" });
  });

  it("does not render an unknown or absent shop item as an avatar", () => {
    expect(shopAvatarDetails(null)).toBeNull();
    expect(shopAvatarDetails("theme-aurora")).toBeNull();
  });

  it("provides 40 distinct purchasable portraits with local image assets", () => {
    expect(PURCHASABLE_AVATARS).toHaveLength(40);
    expect(new Set(PURCHASABLE_AVATARS.map((avatar) => avatar.id)).size).toBe(40);
    for (const avatar of PURCHASABLE_AVATARS) {
      expect(shopAvatarDetails(avatar.id)?.image).toBe(avatar.image);
      expect(existsSync(join(process.cwd(), "public", avatar.image.slice(1)))).toBe(true);
      expect(avatar.label.ru).toBeTruthy();
      expect(avatar.label.uk).toBeTruthy();
    }
  });
});
