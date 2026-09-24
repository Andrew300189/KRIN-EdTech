"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { streakChestKrinCoinReward, streakChestLevel } from "@/modules/motivation/utils/correct-answer-streak";
import { flowerChestById } from "@/modules/motivation/utils/flower-chests";
import type { StreakQuestBookSummary } from "@/modules/motivation/services/streak-quest-book.service";
import styles from "./StreakChestReward.module.css";

type Reward = {
  opened: boolean;
  alreadyOpened: boolean;
  rewardId: string | null;
  experience: number;
  coins: number;
  flowerId?: string | null;
  waterLily?: number;
  hintCredits: number;
  translationCredits: number;
  questBook?: StreakQuestBookSummary | null;
};

const copy = {
  en: { title: "Flower streak chest", streak: "Streak", flowerChest: "Flower chest", ready: "A flower is ready to bloom!", description: "Open the bud to reveal its own learning reward — and sometimes a quest book.", open: "Let it bloom", opening: "Blooming…", continue: "Continue", hint: "Hint XP", translation: "Translation XP", regular: "XP reward", coin: "KRIN Coin", waterLily: "Water Lily", waterLilyNote: "Keep it to restore a lost daily streak after a completed lesson with first-try answers.", questBook: "Quest book", kinds: "Possible rewards", already: "This flower was already opened.", error: "Could not open the flower. Try again.", close: "Close flower reward", bookFound: "Quest book found!", bookDescription: "Unlock it for {coins} KRIN Coins, then learn {words} words to collect every reward.", openBook: "View quest book", rarities: { COMMON: "Common", UNCOMMON: "Uncommon", RARE: "Rare", EPIC: "Epic", LEGENDARY: "Legendary" } },
  ru: { title: "Цветок за стрик", streak: "Стрик", flowerChest: "Цветочный бутон", ready: "Цветок готов распуститься!", description: "Откройте бутон: у каждого цветка свой набор учебных наград, а иногда — книга-квест.", open: "Раскрыть цветок", opening: "Раскрываем…", continue: "Продолжить", hint: "XP для подсказки", translation: "XP для перевода", regular: "XP-награда", coin: "KRIN Coin", waterLily: "Кувшинка", waterLilyNote: "Сохраните её: она бесплатно восстановит сгоревшую серию после завершённого урока с ответами с первой попытки.", questBook: "Книга-квест", kinds: "Возможные награды", already: "Этот цветок уже был открыт.", error: "Не удалось открыть цветок. Попробуйте ещё раз.", close: "Закрыть награду-цветок", bookFound: "Выпала книга-квест!", bookDescription: "Разблокируйте её за {coins} KRIN Coins и правильно выучите {words} слов, чтобы забрать все награды.", openBook: "Открыть книгу-квест", rarities: { COMMON: "Обычный", UNCOMMON: "Необычный", RARE: "Редкий", EPIC: "Эпический", LEGENDARY: "Легендарный" } },
  uk: { title: "Квітка за стрік", streak: "Стрік", flowerChest: "Квітковий бутон", ready: "Квітка готова розквітнути!", description: "Відкрийте бутон: кожна квітка має власний набір навчальних нагород, а інколи — книгу-квест.", open: "Розкрити квітку", opening: "Розкриваємо…", continue: "Продовжити", hint: "XP для підказки", translation: "XP для перекладу", regular: "XP-нагорода", coin: "KRIN Coin", waterLily: "Латаття", waterLilyNote: "Збережіть його: воно безкоштовно відновить згорілу серію після завершеного уроку з відповідями з першої спроби.", questBook: "Книга-квест", kinds: "Можливі нагороди", already: "Цю квітку вже відкрито.", error: "Не вдалося відкрити квітку. Спробуйте ще раз.", close: "Закрити нагороду-квітку", bookFound: "Випала книга-квест!", bookDescription: "Розблокуйте її за {coins} KRIN Coins і правильно вивчіть {words} слів, щоб забрати всі нагороди.", openBook: "Відкрити книгу-квест", rarities: { COMMON: "Звичайна", UNCOMMON: "Незвичайна", RARE: "Рідкісна", EPIC: "Епічна", LEGENDARY: "Легендарна" } },
} as const;

function rewardKind(reward: Reward) {
  if (reward.coins > 0) return "coin" as const;
  if (reward.hintCredits > 0) return "hint" as const;
  if (reward.translationCredits > 0) return "translation" as const;
  return "regular" as const;
}

/** A server-verified reward surface for a newly reached correct-answer streak. */
export function StreakChestReward({ milestone, onDismiss }: { milestone: number | null; onDismiss: () => void }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpening(false);
    setReward(null);
    setError(null);
  }, [milestone]);

  async function openChest() {
    if (!milestone || opening || reward) return;
    setOpening(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/rewards/streak-chest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone }),
      });
      const payload = await response.json().catch(() => null) as { data?: Reward; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.error);
      setReward(payload.data);
      // A retry can return an already-opened reward when the original browser
      // request committed on the server but its response was interrupted.
      // Refresh the balance in both cases: the ledger, not this response flag,
      // is the source of truth for whether the XP was credited.
      if (payload.data.opened || payload.data.alreadyOpened) notifyMotivationUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setOpening(false);
    }
  }

  if (!milestone) return null;
  const chestLevel = streakChestLevel(milestone);
  const flower = flowerChestById(reward?.flowerId);
  const chestStyle = { "--chest-hue": String(flower?.hue ?? 142) } as CSSProperties;
  const earnsKrinCoin = streakChestKrinCoinReward(milestone) > 0;
  const kind = reward ? rewardKind(reward) : null;
  const kindLabel = kind === "coin" ? text.coin : kind === "hint" ? text.hint : kind === "translation" ? text.translation : text.regular;
  const flowerName = flower?.names[locale] ?? flower?.names.ru;

  return <AppModal
    open
    // An earned chest is a pending reward, not a dismissible announcement.
    // Keep it visible until its server-verified reward has been opened.
    onOpenChange={(open) => { if (!open && reward) onDismiss(); }}
    title={text.title}
    closeLabel={text.close}
    size="small"
    closeOnOverlayClick={Boolean(reward)}
    closeOnEscape={Boolean(reward)}
    preventClose={!reward}
    showCloseButton={Boolean(reward)}
    bodyClassName={styles.body}
  >
    <section className={styles.card} style={chestStyle} aria-live="polite">
      <p className={styles.streak}>{text.streak} ×{milestone}</p>
      <button type="button" className={`${styles.chest} ${opening ? styles.opening : ""} ${reward ? styles.opened : ""}`} onClick={() => void openChest()} disabled={opening || Boolean(reward)} aria-label={text.open}>
        <span aria-hidden="true">{flower?.icon ?? "🌱"}</span>
      </button>
      <span className={`${styles.tierName} ${flower?.rarity === "LEGENDARY" ? styles.legendary : ""}`}>{flower ? `${flowerName} · ${text.rarities[flower.rarity]} · ${text.streak} ×${milestone}` : `${text.flowerChest} · ${text.streak} ×${milestone}`}</span>
      {!reward ? <>
        <h3>{text.ready}</h3>
        <p>{text.description}</p>
        <div className={styles.kinds} aria-label={text.kinds}>
          <span className={styles.regular}>✦ XP</span><span className={styles.hint}>☀ XP</span><span className={styles.translation}>✧ XP</span>
          <span className={styles.bookKind}>📖 {text.questBook}</span>
          {earnsKrinCoin ? <span className={styles.coinKind}>● +1 {text.coin}</span> : null}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button type="button" className={styles.openButton} onClick={() => void openChest()} disabled={opening}>{opening ? text.opening : text.open}</button>
      </> : <>
        <section className={`${styles.reward} ${styles[kind!] ?? ""} ${flower?.rarity === "LEGENDARY" ? styles.legendaryReward : ""}`}>
          <span aria-hidden="true">{flower?.icon ?? (kind === "coin" ? "●" : kind === "hint" ? "☀" : kind === "translation" ? "✧" : "✦")}</span>
          <div><strong>{flowerName ? `${flowerName} · ${text.rarities[flower!.rarity]}` : kindLabel}</strong><p>+{reward.experience} XP{reward.coins ? ` · +${reward.coins} KRIN Coin` : ""}{reward.hintCredits ? ` · +${reward.hintCredits} ${text.hint}` : ""}{reward.translationCredits ? ` · +${reward.translationCredits} ${text.translation}` : ""}</p></div>
        </section>
        {reward.waterLily ? <section className={styles.waterLily}><span aria-hidden="true">🪷</span><div><strong>+{reward.waterLily} {text.waterLily}</strong><p>{text.waterLilyNote}</p></div></section> : null}
        <p className={styles.rewardNote}>{reward.alreadyOpened ? text.already : text.description}</p>
        {reward.questBook ? <section className={styles.questBook}>
          <span aria-hidden="true">📖</span>
          <div><strong>{text.bookFound} · {text.streak} ×{reward.questBook.level}</strong><p>{text.bookDescription.replace("{coins}", String(reward.questBook.unlockCost)).replace("{words}", String(reward.questBook.target))}</p><Link href="/student/achievements#quest-books" onClick={onDismiss}>{text.openBook}</Link></div>
        </section> : null}
        <button type="button" className={styles.continueButton} onClick={onDismiss}>{text.continue}</button>
      </>}
    </section>
  </AppModal>;
}
