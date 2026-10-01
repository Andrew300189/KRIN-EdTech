"use client";

/* Generated avatar art is served from this app's public assets. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";
import { SHOP_POSTCARDS } from "@/modules/motivation/utils/shop-postcards";
import styles from "./ShopPage.module.css";

type ShopItem = { id: string; kind: "theme" | "avatar" | "discount" | "recovery" | "booster" | "collectible"; price: number; title: string; description: string; owned: boolean; quantity: number; value?: number; rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" };
type ShopState = { balance: number; items: ShopItem[]; equippedTheme: string | null; equippedAvatar: string | null; coupons: string[] };

const copy = {
  en: { eyebrow: "KRIN rewards", title: "Reward shop", subtitle: "Collect scenes and looks. Water Lilies can restore a lesson answer streak; bought XP never counts toward ranking.", balance: "Your balance", buy: "Buy", owned: "Owned", equip: "Use", equipped: "In use", inInventory: "In inventory", open: "Open", close: "Close", listen: "Listen", album: "My scene album", coupon: "Your one-use Premium / Pro code", copied: "Discount code copied", error: "The shop is unavailable right now.", loading: "Opening shop…" },
  ru: { eyebrow: "Награды KRIN", title: "Магазин наград", subtitle: "Собирайте сцены и образы. Кувшинки восстанавливают серию ответов; купленный XP не влияет на рейтинг.", balance: "Ваш баланс", buy: "Купить", owned: "Куплено", equip: "Использовать", equipped: "Выбрано", inInventory: "В запасе", open: "Открыть", close: "Закрыть", listen: "Послушать", album: "Мой альбом сцен", coupon: "Ваш одноразовый код на Premium / Pro", copied: "Код скидки скопирован", error: "Магазин сейчас недоступен.", loading: "Открываем магазин…" },
  uk: { eyebrow: "Нагороди KRIN", title: "Магазин нагород", subtitle: "Колекціонуйте сцени й образи. Латаття відновлює серію відповідей; куплений XP не впливає на рейтинг.", balance: "Ваш баланс", buy: "Купити", owned: "Придбано", equip: "Використати", equipped: "Обрано", inInventory: "У запасі", open: "Відкрити", close: "Закрити", listen: "Послухати", album: "Мій альбом сцен", coupon: "Ваш одноразовий код на Premium / Pro", copied: "Код знижки скопійовано", error: "Магазин зараз недоступний.", loading: "Відкриваємо магазин…" },
} as const;

const consumableCopy = {
  en: { "xp-boost-15": ["Learning spark · +15 XP", "Adds 15 XP to the next newly completed lesson; excluded from ranking."], "xp-boost-40": ["Knowledge bloom · +40 XP", "Adds 40 XP to the next newly completed lesson; excluded from ranking."] },
  ru: { "xp-boost-15": ["Искра знаний · +15 XP", "Добавит 15 XP за следующий впервые завершённый урок, но не в рейтинг."], "xp-boost-40": ["Цветение знаний · +40 XP", "Добавит 40 XP за следующий впервые завершённый урок, но не в рейтинг."] },
  uk: { "xp-boost-15": ["Іскра знань · +15 XP", "Додасть 15 XP за наступний уперше завершений урок, але не до рейтингу."], "xp-boost-40": ["Цвітіння знань · +40 XP", "Додасть 40 XP за наступний уперше завершений урок, але не до рейтингу."] },
} as const;

const shopSections = ["collectible", "avatar", "theme", "recovery", "booster", "discount"] as const;
const rarityCopy = {
  en: { COMMON: "Common", UNCOMMON: "Uncommon", RARE: "Rare", EPIC: "Epic", LEGENDARY: "Legendary" },
  ru: { COMMON: "Обычная", UNCOMMON: "Необычная", RARE: "Редкая", EPIC: "Эпическая", LEGENDARY: "Легендарная" },
  uk: { COMMON: "Звичайна", UNCOMMON: "Незвичайна", RARE: "Рідкісна", EPIC: "Епічна", LEGENDARY: "Легендарна" },
} as const;
const specialItemCopy: Record<"en" | "ru" | "uk", Record<string, [string, string]>> = {
  en: { "theme-aurora": ["Aurora palette", "A calm violet-and-mint learning space."], "theme-sunrise": ["Sunrise palette", "A warm, high-contrast learning space."], "premium-discount-10": ["10% Premium or Pro discount", "A personal code for a future subscription checkout."] },
  ru: { "theme-aurora": ["Палитра «Аврора»", "Спокойные фиолетовые и мятные цвета."], "theme-sunrise": ["Палитра «Рассвет»", "Тёплые контрастные цвета."], "premium-discount-10": ["Скидка 10% на Premium или Pro", "Личный код для будущей оплаты подписки."] },
  uk: { "theme-aurora": ["Палітра «Аврора»", "Спокійні фіолетові та м’ятні кольори."], "theme-sunrise": ["Палітра «Світанок»", "Теплі контрастні кольори."], "premium-discount-10": ["Знижка 10% на Premium або Pro", "Особистий код для майбутньої оплати підписки."] },
};
const sectionCopy = {
  en: {
    collectible: { title: "Scene postcards", description: "Collect small stories. Open each one to listen and recall a useful phrase." },
    recovery: { title: "Water Lilies and recovery", description: "Keep an answer streak going when a mistake interrupts it." },
    booster: { title: "XP boosts", description: "Earn extra XP on an upcoming lesson." },
    avatar: { title: "Avatars", description: "Choose a new look for your profile." },
    theme: { title: "Site palettes", description: "Change the colours of your learning space." },
    discount: { title: "Discounts", description: "Offers for a subscription upgrade." },
  },
  ru: {
    collectible: { title: "Открытки-сцены", description: "Собирайте мини-истории. Откройте открытку, чтобы послушать и вспомнить фразу." },
    recovery: { title: "Кувшинки и восстановление", description: "Продолжайте серию ответов после ошибки." },
    booster: { title: "Усилители XP", description: "Получайте больше XP за следующий урок." },
    avatar: { title: "Аватары", description: "Выберите новый образ для профиля." },
    theme: { title: "Палитры сайта", description: "Измените цвета учебного пространства." },
    discount: { title: "Скидки", description: "Предложения для улучшения подписки." },
  },
  uk: {
    collectible: { title: "Листівки-сцени", description: "Колекціонуйте мініісторії. Відкрийте листівку, щоб послухати й згадати фразу." },
    recovery: { title: "Латаття та відновлення", description: "Продовжуйте серію відповідей після помилки." },
    booster: { title: "Підсилювачі XP", description: "Отримуйте більше XP за наступний урок." },
    avatar: { title: "Аватари", description: "Оберіть новий образ для профілю." },
    theme: { title: "Палітри сайту", description: "Змініть кольори навчального простору." },
    discount: { title: "Знижки", description: "Пропозиції для поліпшення підписки." },
  },
} as const;

export function ShopPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const text = copy[locale];
  const [shop, setShop] = useState<ShopState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openPostcardId, setOpenPostcardId] = useState<string | null>(null);

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
      const postcard = SHOP_POSTCARDS.find((entry) => entry.id === item.id);
      toast.success(payload.data.coupon ? text.copied : postcard?.[locale] ?? consumableCopy[locale][item.id as keyof typeof consumableCopy["en"]]?.[0] ?? specialItemCopy[locale][item.id]?.[0] ?? item.title);
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
  const visibleSections = shopSections.filter((kind) => shop.items.some((item) => item.kind === kind));
  const openPostcard = SHOP_POSTCARDS.find((postcard) => postcard.id === openPostcardId && shop.items.some((item) => item.id === postcard.id && item.owned));
  const ownedPostcards = SHOP_POSTCARDS.filter((postcard) => shop.items.some((item) => item.id === postcard.id && item.owned));
  return <section className={styles.page}>
    <header className={styles.hero}><div><p>{text.eyebrow}</p><h2>{text.title}</h2><span>{text.subtitle}</span></div><div className={styles.balance}><small>{text.balance}</small><strong>◉ {shop.balance.toFixed(2)}</strong></div></header>
    {ownedPostcards.length ? <section className={styles.album} aria-label={text.album}><h3>{text.album} · {ownedPostcards.length}/{SHOP_POSTCARDS.length}</h3><div>{ownedPostcards.map((postcard) => <button key={postcard.id} type="button" onClick={() => setOpenPostcardId(postcard.id)} aria-label={`${text.open}: ${postcard[locale]}`}>{postcard.icon} {postcard[locale]}</button>)}</div></section> : null}
    {openPostcard ? <section className={styles.openPostcard} aria-live="polite"><span aria-hidden="true">{openPostcard.icon}</span><div><h3>{openPostcard[locale]}</h3><p lang="en">{openPostcard.phrase}</p>{locale !== "en" ? <small>{locale === "ru" ? openPostcard.phraseRu : openPostcard.phraseUk}</small> : null}</div><button type="button" onClick={() => { if (typeof window !== "undefined" && "speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(openPostcard.phrase); utterance.lang = "en-GB"; window.speechSynthesis.speak(utterance); } }}>{text.listen}</button><button type="button" onClick={() => setOpenPostcardId(null)}>{text.close}</button></section> : null}
    {shop.coupons.length ? <section className={styles.couponPanel}><div><span>✦</span><p>{text.coupon}</p></div>{shop.coupons.map((coupon) => <button key={coupon} type="button" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(coupon).then(() => toast.success(text.copied)).catch(() => undefined); }}>{coupon}</button>)}</section> : null}
    <nav className={styles.categoryNav} aria-label={locale === "ru" ? "Разделы магазина" : locale === "uk" ? "Розділи магазину" : "Shop sections"}>
      {visibleSections.map((kind) => <a key={kind} href={`#shop-${kind}`}>{sectionCopy[locale][kind].title}<span>{shop.items.filter((item) => item.kind === kind).length}</span></a>)}
    </nav>
    <div className={styles.sections}>{visibleSections.map((kind) => <section key={kind} id={`shop-${kind}`} className={styles.category} aria-labelledby={`shop-${kind}-title`}>
      <header className={styles.categoryHeader}><div><h3 id={`shop-${kind}-title`}>{sectionCopy[locale][kind].title}</h3><p>{sectionCopy[locale][kind].description}</p></div><span>{shop.items.filter((item) => item.kind === kind).length}</span></header>
      <div className={styles.grid}>{shop.items.filter((item) => item.kind === kind).map((item) => {
      const equipped = item.kind === "theme" ? shop.equippedTheme === item.id : item.kind === "avatar" ? shop.equippedAvatar === item.id : false;
      const avatar = item.kind === "avatar" ? shopAvatarDetails(item.id) : null;
      const localized = avatar?.localized?.[locale];
      const consumable = consumableCopy[locale][item.id as keyof typeof consumableCopy["en"]];
      const special = specialItemCopy[locale][item.id];
      const postcard = item.kind === "collectible" ? SHOP_POSTCARDS.find((entry) => entry.id === item.id) : null;
      const lilyTitle = item.kind === "recovery" && item.value != null ? `${locale === "uk" ? "Латаття" : locale === "ru" ? "Кувшинка" : "Water Lily"} · ×${item.value}` : null;
      const lilyDescription = item.kind === "recovery" && item.value != null ? (locale === "uk" ? `Відновлює перервану серію до ${item.value} правильних відповідей.` : locale === "ru" ? `Восстанавливает прерванную серию до ${item.value} правильных ответов.` : `Restores an interrupted streak of up to ${item.value} correct answers.`) : null;
      const repeatable = item.kind === "recovery" || item.kind === "booster";
      return <article key={item.id} id={item.id} className={`${styles.item} ${equipped ? styles.itemEquipped : ""}`}>
        <div className={`${styles.preview} ${styles[`preview${item.kind[0].toUpperCase()}${item.kind.slice(1)}`]}`}>{avatar?.image ? <img src={avatar.image} alt="" /> : avatar ? avatar.glyph : postcard ? postcard.icon : item.kind === "recovery" ? "🪷" : item.kind === "booster" ? "✦" : item.kind === "discount" ? "%" : item.id === "theme-aurora" ? "✦" : "☀"}</div>
        <div className={styles.itemCopy}><h3>{localized?.label ?? lilyTitle ?? postcard?.[locale] ?? consumable?.[0] ?? special?.[0] ?? item.title}</h3><p>{localized?.description ?? lilyDescription ?? (postcard ? postcard.phrase : null) ?? consumable?.[1] ?? special?.[1] ?? item.description}</p>{item.rarity ? <span className={styles.rarity} data-rarity={item.rarity}>{rarityCopy[locale][item.rarity]}</span> : null}{repeatable ? <span className={styles.quantity}>{text.inInventory}: {item.quantity}</span> : null}</div>
        <footer><strong>◉ {item.price.toFixed(2)}</strong>{repeatable || !item.owned ? <button type="button" disabled={busy === item.id || shop.balance < item.price} onClick={() => void purchase(item)}>{busy === item.id ? "…" : text.buy}</button> : item.kind === "collectible" ? <button type="button" onClick={() => setOpenPostcardId(item.id)}>{text.open}</button> : item.kind === "discount" ? <span className={styles.owned}>{text.owned}</span> : <button type="button" disabled={busy === item.id || equipped} onClick={() => void equip(item)}>{equipped ? text.equipped : text.equip}</button>}</footer>
      </article>;
      })}</div>
    </section>)}</div>
  </section>;
}
