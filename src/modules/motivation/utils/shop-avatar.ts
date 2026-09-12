export type ShopAvatar = {
  glyph: string;
  label: string;
};

/**
 * The shop stores a stable item id, while the interface needs the visual
 * representation. Keeping that mapping in one place prevents a newly
 * equipped avatar from disappearing in a different header or profile view.
 */
const SHOP_AVATARS: Record<string, ShopAvatar> = {
  "avatar-fox": { glyph: "🦊", label: "Fox avatar" },
  "avatar-owl": { glyph: "🦉", label: "Owl avatar" },
};

export function shopAvatarDetails(avatarId: string | null | undefined): ShopAvatar | null {
  if (!avatarId) return null;
  return SHOP_AVATARS[avatarId] ?? null;
}
