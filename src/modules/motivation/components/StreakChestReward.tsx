"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { streakChestKrinCoinReward, streakChestLevel } from "@/modules/motivation/utils/correct-answer-streak";
import type { StreakQuestBookSummary } from "@/modules/motivation/services/streak-quest-book.service";
import styles from "./StreakChestReward.module.css";

type Reward = {
  opened: boolean;
  alreadyOpened: boolean;
  rewardId: string | null;
  experience: number;
  coins: number;
  xpCoins?: number;
  hintCredits: number;
  translationCredits: number;
  questBook?: StreakQuestBookSummary | null;
};

const copy = {
  en: { title: "Flower streak chest", streak: "Streak", flowerChest: "Flower chest", ready: "A chest is yours!", description: "Open it to reveal a learning reward — and sometimes a quest book.", open: "Open chest", opening: "Opening…", continue: "Continue", hint: "Hint XP", translation: "Translation XP", regular: "XP reward", coin: "KRIN Coin", xpCoin: "XP Coins", questBook: "Quest book", kinds: "Possible rewards", already: "This chest was already opened.", error: "Could not open the chest. Try again.", close: "Close streak chest", bookFound: "Quest book found!", bookDescription: "Unlock it for {coins} KRIN Coins, then learn {words} words to collect every reward.", openBook: "View quest book", colors: { violet: "Violet", blue: "Blue", mint: "Mint", yellow: "Yellow", orange: "Orange", coral: "Coral", pink: "Pink" } },
  ru: { title: "Цветочный сундук стрика", streak: "Стрик", flowerChest: "Цветочный сундук", ready: "Вы заработали сундук!", description: "Откройте его: внутри учебная награда, а иногда и книга-квест.", open: "Открыть сундук", opening: "Открываем…", continue: "Продолжить", hint: "XP для подсказки", translation: "XP для перевода", regular: "XP-награда", coin: "KRIN Coin", xpCoin: "XP Coins", questBook: "Книга-квест", kinds: "Возможные награды", already: "Этот сундук уже был открыт.", error: "Не удалось открыть сундук. Попробуйте ещё раз.", close: "Закрыть сундук стрика", bookFound: "Выпала книга-квест!", bookDescription: "Разблокируйте её за {coins} KRIN Coins и правильно выучите {words} слов, чтобы забрать все награды.", openBook: "Открыть книгу-квест", colors: { violet: "Фиолетовый", blue: "Синий", mint: "Мятный", yellow: "Жёлтый", orange: "Оранжевый", coral: "Коралловый", pink: "Розовый" } },
  uk: { title: "Квіткова скриня стрика", streak: "Стрик", flowerChest: "Квіткова скриня", ready: "Ви заробили скриню!", description: "Відкрийте її: усередині навчальна нагорода, а іноді й книга-квест.", open: "Відкрити скриню", opening: "Відкриваємо…", continue: "Продовжити", hint: "XP для підказки", translation: "XP для перекладу", regular: "XP-нагорода", coin: "KRIN Coin", xpCoin: "XP Coins", questBook: "Книга-квест", kinds: "Можливі нагороди", already: "Цю скриню вже було відкрито.", error: "Не вдалося відкрити скриню. Спробуйте ще раз.", close: "Закрити скриню стрика", bookFound: "Випала книга-квест!", bookDescription: "Розблокуйте її за {coins} KRIN Coins і правильно вивчіть {words} слів, щоб забрати всі нагороди.", openBook: "Відкрити книгу-квест", colors: { violet: "Фіолетова", blue: "Синя", mint: "М’ятна", yellow: "Жовта", orange: "Помаранчева", coral: "Коралова", pink: "Рожева" } },
} as const;

const CHEST_FLOWERS = [
  { color: "violet", icon: "🪻", hue: 270 },
  { color: "blue", icon: "🌸", hue: 220 },
  { color: "mint", icon: "🌿", hue: 165 },
  { color: "yellow", icon: "🌼", hue: 48 },
  { color: "orange", icon: "🌻", hue: 27 },
  { color: "coral", icon: "🌺", hue: 10 },
  { color: "pink", icon: "🌷", hue: 330 },
] as const;

function rewardKind(reward: Reward) {
  if (reward.coins > 0) return "coin" as const;
  if ((reward.xpCoins ?? 0) > 0) return "xpCoin" as const;
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
  const flower = CHEST_FLOWERS[(Math.max(1, chestLevel) - 1) % CHEST_FLOWERS.length];
  const chestStyle = { "--chest-hue": String(flower.hue) } as CSSProperties;
  const earnsKrinCoin = streakChestKrinCoinReward(milestone) > 0;
  const kind = reward ? rewardKind(reward) : null;
  const kindLabel = kind === "coin" ? text.coin : kind === "xpCoin" ? text.xpCoin : kind === "hint" ? text.hint : kind === "translation" ? text.translation : text.regular;

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
        <span aria-hidden="true">{flower.icon}</span>
      </button>
      <span className={styles.tierName}>{text.flowerChest} · {text.colors[flower.color]} · {chestLevel}</span>
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
        <section className={`${styles.reward} ${styles[kind!]}`}>
          <span aria-hidden="true">{kind === "coin" ? "●" : kind === "xpCoin" ? "◈" : kind === "hint" ? "☀" : kind === "translation" ? "✧" : "✦"}</span>
          <div><strong>{kindLabel}</strong><p>+{reward.experience} XP{reward.coins ? ` · +${reward.coins} KRIN Coin` : ""}{reward.xpCoins ? ` · +${reward.xpCoins.toFixed(2)} XP Coins` : ""}{reward.hintCredits ? ` · +${reward.hintCredits}` : ""}{reward.translationCredits ? ` · +${reward.translationCredits}` : ""}</p></div>
        </section>
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
