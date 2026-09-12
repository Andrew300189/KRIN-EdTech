"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";
import styles from "./ShopPage.module.css";

type ShopItem = { id: string; kind: "theme" | "avatar" | "discount"; price: number; title: string; description: string; owned: boolean };
type ShopState = { balance: number; items: ShopItem[]; equippedTheme: string | null; equippedAvatar: string | null; coupons: string[] };

const copy = {
  en: { eyebrow: "KRIN rewards", title: "Reward shop", subtitle: "Spend earned Coins on a personal look and secure checkout discounts.", balance: "Your balance", buy: "Buy", owned: "Owned", equip: "Use", equipped: "In use", coupon: "Your one-use Premium / Pro code", copied: "Discount code copied", error: "The shop is unavailable right now.", loading: "Opening shop…" },
  ru: { eyebrow: "Награды KRIN", title: "Магазин наград", subtitle: "Тратьте заработанные Coins на оформление и скидки для оплаты.", balance: "Ваш баланс", buy: "Купить", owned: "Куплено", equip: "Использовать", equipped: "Выбрано", coupon: "Ваш одноразовый код на Premium / Pro", copied: "Код скидки скопирован", error: "Магазин сейчас недоступен.", loading: "Открываем магазин…" },
  uk: { eyebrow: "Нагороди KRIN", title: "Магазин нагород", subtitle: "Витрачайте зароблені Coins на оформлення та знижки для оплати.", balance: "Ваш баланс", buy: "Купити", owned: "Придбано", equip: "Використати", equipped: "Обрано", coupon: "Ваш одноразовий код на Premium / Pro", copied: "Код знижки скопійовано", error: "Магазин зараз недоступний.", loading: "Відкриваємо магазин…" },
} as const;

export function ShopPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const text = copy[locale];
  const [shop, setShop] = useState<ShopState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
      const response = await fetch("/api/profile/shop/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id }) });
      const payload = await response.json().catch(() => null) as { data?: { purchased: boolean; coupon?: string | null }; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.error);
      if (payload.data.coupon && navigator.clipboard) await navigator.clipboard.writeText(payload.data.coupon).catch(() => undefined);
      await load();
      notifyMotivationUpdated();
      toast.success(payload.data.coupon ? text.copied : item.title);
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
    <div className={styles.grid}>{shop.items.map((item) => {
      const equipped = item.kind === "theme" ? shop.equippedTheme === item.id : item.kind === "avatar" ? shop.equippedAvatar === item.id : false;
      return <article key={item.id} className={`${styles.item} ${equipped ? styles.itemEquipped : ""}`}>
        <div className={`${styles.preview} ${styles[`preview${item.kind[0].toUpperCase()}${item.kind.slice(1)}`]}`}>{item.kind === "avatar" ? shopAvatarDetails(item.id)?.glyph ?? "✦" : item.kind === "discount" ? "%" : item.id === "theme-aurora" ? "✦" : "☀"}</div>
        <div className={styles.itemCopy}><h3>{item.title}</h3><p>{item.description}</p></div>
        <footer><strong>◉ {item.price}</strong>{!item.owned ? <button type="button" disabled={busy === item.id || shop.balance < item.price} onClick={() => void purchase(item)}>{busy === item.id ? "…" : text.buy}</button> : item.kind === "discount" ? <span className={styles.owned}>{text.owned}</span> : <button type="button" disabled={busy === item.id || equipped} onClick={() => void equip(item)}>{equipped ? text.equipped : text.equip}</button>}</footer>
      </article>;
    })}</div>
  </section>;
}
