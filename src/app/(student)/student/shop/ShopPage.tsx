"use client";

/* Generated avatar art is served from this app's public assets. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";
import styles from "./ShopPage.module.css";

type ShopItem = { id: string; kind: "theme" | "avatar" | "discount" | "recovery" | "booster"; price: number; title: string; description: string; owned: boolean; quantity: number };
type ShopState = { balance: number; items: ShopItem[]; equippedTheme: string | null; equippedAvatar: string | null; coupons: string[] };

const copy = {
  en: { eyebrow: "KRIN rewards", title: "Reward shop", subtitle: "Choose avatars, a Water Lily for streak recovery, and one-lesson XP boosters.", balance: "Your balance", buy: "Buy", owned: "Owned", equip: "Use", equipped: "In use", inInventory: "In inventory", coupon: "Your one-use Premium / Pro code", copied: "Discount code copied", error: "The shop is unavailable right now.", loading: "Opening shop…" },
  ru: { eyebrow: "Награды KRIN", title: "Магазин наград", subtitle: "Аватары, Кувшинка для восстановления серии и усилители XP на один урок.", balance: "Ваш баланс", buy: "Купить", owned: "Куплено", equip: "Использовать", equipped: "Выбрано", inInventory: "В запасе", coupon: "Ваш одноразовый код на Premium / Pro", copied: "Код скидки скопирован", error: "Магазин сейчас недоступен.", loading: "Открываем магазин…" },
  uk: { eyebrow: "Нагороди KRIN", title: "Магазин нагород", subtitle: "Аватари, Латаття для відновлення серії та підсилювачі XP на один урок.", balance: "Ваш баланс", buy: "Купити", owned: "Придбано", equip: "Використати", equipped: "Обрано", inInventory: "У запасі", coupon: "Ваш одноразовий код на Premium / Pro", copied: "Код знижки скопійовано", error: "Магазин зараз недоступний.", loading: "Відкриваємо магазин…" },
} as const;

const consumableCopy = {
  en: { "water-lily": ["Water Lily", "Earned with a flower chest once per 50-answer streak cycle, or bought here. Restores one lost daily streak after a lesson with a first-try correct answer."], "xp-boost-15": ["Learning spark · +15 XP", "Automatically adds 15 XP to the next newly completed lesson."], "xp-boost-40": ["Knowledge bloom · +40 XP", "Automatically adds 40 XP to the next newly completed lesson."] },
  ru: { "water-lily": ["Кувшинка · восстановление", "Выпадает с цветком раз за цикл из 50 правильных ответов или покупается здесь. Восстанавливает одну серию после урока с ответом с первой попытки."], "xp-boost-15": ["Искра знаний · +15 XP", "Автоматически добавит 15 XP за следующий впервые завершённый урок."], "xp-boost-40": ["Цветение знаний · +40 XP", "Автоматически добавит 40 XP за следующий впервые завершённый урок."] },
  uk: { "water-lily": ["Латаття · відновлення", "Випадає з квіткою раз за цикл із 50 правильних відповідей або купується тут. Відновлює одну серію після уроку з відповіддю з першої спроби."], "xp-boost-15": ["Іскра знань · +15 XP", "Автоматично додасть 15 XP за наступний уперше завершений урок."], "xp-boost-40": ["Цвітіння знань · +40 XP", "Автоматично додасть 40 XP за наступний уперше завершений урок."] },
} as const;

export function ShopPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const text = copy[locale];
  const [shop, setShop] = useState<ShopState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ShopItem["kind"]>("all");

  const load = useCallback(async () => {
    const response = await fetch("/api/profile/shop", { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { data?: ShopState; error?: string } | null;
    if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.error);
    setShop(payload.data);
  }, [text.error]);

  useEffect(() => { void load().catch((error) => toast.error(error instanceof Error ? error.message : text.error)); }, [load, text.error]);

  async function purchase(item: ShopItem) {
    setBusy(item.id);
    try {
      const response = await fetch("/api/profile/shop/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, purchaseId: crypto.randomUUID() }) });
      const payload = await response.json().catch(() => null) as { data?: { purchased: boolean; coupon?: string | null }; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.error);
      if (payload.data.coupon && navigator.clipboard) await navigator.clipboard.writeText(payload.data.coupon).catch(() => undefined);
      await load();
      notifyMotivationUpdated();
      toast.success(payload.data.coupon ? text.copied : consumableCopy[locale][item.id as keyof typeof consumableCopy["en"]]?.[0] ?? item.title);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.error);
    } finally { setBusy(null); }
  }

  async function equip(item: ShopItem) {
    setBusy(item.id);
    try {
      const response = await fetch("/api/profile/shop/equip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id }) });
      const payload = await response.json().catch(() => null) as { data?: { equippedTheme: string | null; equippedAvatar: string | null; avatarDisplayMode: "PHOTO" | "SHOP" }; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.error);
      if (item.kind === "theme") {
        document.documentElement.dataset.shopTheme = item.id;
        try { window.localStorage.setItem("krin-shop-theme", item.id); } catch { /* styling remains active in this tab */ }
      }
      await load();
      // The workspace header receives account details from the server layout.
      // Refresh that layout after an avatar is selected so it changes at once.
      if (item.kind === "avatar") router.refresh();
      toast.success(text.equipped);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.error);
    } finally { setBusy(null); }
  }

  if (!shop) return <section className={styles.loading}>{text.loading}</section>;
  return <section className={styles.page}>
    <header className={styles.hero}><div><p>{text.eyebrow}</p><h2>{text.title}</h2><span>{text.subtitle}</span></div><div className={styles.balance}><small>{text.balance}</small><strong>◉ {shop.balance.toFixed(2)}</strong></div></header>
    {shop.coupons.length ? <section className={styles.couponPanel}><div><span>✦</span><p>{text.coupon}</p></div>{shop.coupons.map((coupon) => <button key={coupon} type="button" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(coupon).then(() => toast.success(text.copied)).catch(() => undefined); }}>{coupon}</button>)}</section> : null}
    <div className={styles.filters} role="group" aria-label={locale === "ru" ? "Категории магазина" : locale === "uk" ? "Категорії магазину" : "Shop categories"}>
      {(["all", "recovery", "booster", "avatar", "theme", "discount"] as const).map((kind) => <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind)}>{locale === "ru" ? { all: "Всё", recovery: "Восстановление", booster: "Больше XP", avatar: "Аватары", theme: "Темы", discount: "Скидки" }[kind] : locale === "uk" ? { all: "Усе", recovery: "Відновлення", booster: "Більше XP", avatar: "Аватари", theme: "Теми", discount: "Знижки" }[kind] : { all: "All", recovery: "Recovery", booster: "More XP", avatar: "Avatars", theme: "Themes", discount: "Discounts" }[kind]}</button>)}
    </div>
    <div className={styles.grid}>{shop.items.filter((item) => filter === "all" || item.kind === filter).map((item) => {
      const equipped = item.kind === "theme" ? shop.equippedTheme === item.id : item.kind === "avatar" ? shop.equippedAvatar === item.id : false;
      const avatar = item.kind === "avatar" ? shopAvatarDetails(item.id) : null;
      const localized = avatar?.localized?.[locale];
      const consumable = consumableCopy[locale][item.id as keyof typeof consumableCopy["en"]];
      const repeatable = item.kind === "recovery" || item.kind === "booster";
      return <article key={item.id} id={item.id} className={`${styles.item} ${equipped ? styles.itemEquipped : ""}`}>
        <div className={`${styles.preview} ${styles[`preview${item.kind[0].toUpperCase()}${item.kind.slice(1)}`]}`}>{avatar?.image ? <img src={avatar.image} alt="" /> : avatar ? avatar.glyph : item.kind === "recovery" ? "🪷" : item.kind === "booster" ? "✦" : item.kind === "discount" ? "%" : item.id === "theme-aurora" ? "✦" : "☀"}</div>
        <div className={styles.itemCopy}><h3>{localized?.label ?? consumable?.[0] ?? item.title}</h3><p>{localized?.description ?? consumable?.[1] ?? item.description}</p>{repeatable ? <span className={styles.quantity}>{text.inInventory}: {item.quantity}</span> : null}</div>
        <footer><strong>◉ {item.price.toFixed(2)}</strong>{repeatable || !item.owned ? <button type="button" disabled={busy === item.id || shop.balance < item.price} onClick={() => void purchase(item)}>{busy === item.id ? "…" : text.buy}</button> : item.kind === "discount" ? <span className={styles.owned}>{text.owned}</span> : <button type="button" disabled={busy === item.id || equipped} onClick={() => void equip(item)}>{equipped ? text.equipped : text.equip}</button>}</footer>
      </article>;
    })}</div>
  </section>;
}
