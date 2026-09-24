import { PURCHASABLE_AVATARS, type AvatarLocale } from "./shop-avatar-catalog";

export type ShopAvatar = {
  glyph?: string;
  image?: string;
  label: string;
  localized?: Record<AvatarLocale, { label: string; description: string }>;
};

/**
 * The shop stores a stable item id, while the interface needs the visual
 * representation. Keeping that mapping in one place prevents a newly
 * equipped avatar from disappearing in a different header or profile view.
 */
const LEGACY_SHOP_AVATARS: Record<string, ShopAvatar> = {
  "avatar-fox": { glyph: "🦊", label: "Fox avatar" },
  "avatar-owl": { glyph: "🦉", label: "Owl avatar" },
};

const SHOP_AVATARS: Record<string, ShopAvatar> = {
  ...LEGACY_SHOP_AVATARS,
  ...Object.fromEntries(PURCHASABLE_AVATARS.map((avatar) => [avatar.id, {
    image: avatar.image,
    label: avatar.label.en,
    localized: {
      en: { label: avatar.label.en, description: avatar.description.en },
      ru: { label: avatar.label.ru, description: avatar.description.ru },
      uk: { label: avatar.label.uk, description: avatar.description.uk },
    },
  }])),
};

export function shopAvatarDetails(avatarId: string | null | undefined): ShopAvatar | null {
  if (!avatarId) return null;
  return SHOP_AVATARS[avatarId] ?? null;
}
