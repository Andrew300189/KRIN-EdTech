"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { streakChestTier, type StreakChestTier } from "@/modules/motivation/utils/correct-answer-streak";
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
};

const copy = {
  en: { title: "Streak chest", streak: "Streak", ready: "A chest is yours!", description: "Open it to reveal one learning reward.", open: "Open chest", opening: "Opening…", continue: "Continue", hint: "Hint XP", translation: "Translation XP", regular: "XP reward", xpCoin: "XP Coins", kinds: "Possible rewards", already: "This chest was already opened.", error: "Could not open the chest. Try again.", close: "Close streak chest", tiers: { sprout: "Sprout chest", amber: "Amber chest", sapphire: "Sapphire chest", ruby: "Ruby chest", aurora: "Aurora chest", cosmic: "Cosmic chest", mythic: "Mythic chest" } },
  ru: { title: "Сундук стрика", streak: "Стрик", ready: "Вы заработали сундук!", description: "Откройте его и получите одну учебную награду.", open: "Открыть сундук", opening: "Открываем…", continue: "Продолжить", hint: "XP для подсказки", translation: "XP для перевода", regular: "XP-награда", xpCoin: "XP Coins", kinds: "Возможные награды", already: "Этот сундук уже был открыт.", error: "Не удалось открыть сундук. Попробуйте ещё раз.", close: "Закрыть сундук стрика", tiers: { sprout: "Росток", amber: "Янтарный сундук", sapphire: "Сапфировый сундук", ruby: "Рубиновый сундук", aurora: "Сундук Aurora", cosmic: "Космический сундук", mythic: "Мифический сундук" } },
  uk: { title: "Скриня стрика", streak: "Стрик", ready: "Ви заробили скриню!", description: "Відкрийте її та отримайте одну навчальну нагороду.", open: "Відкрити скриню", opening: "Відкриваємо…", continue: "Продовжити", hint: "XP для підказки", translation: "XP для перекладу", regular: "XP-нагорода", xpCoin: "XP Coins", kinds: "Можливі нагороди", already: "Цю скриню вже було відкрито.", error: "Не вдалося відкрити скриню. Спробуйте ще раз.", close: "Закрити скриню стрика", tiers: { sprout: "Скриня-паросток", amber: "Бурштинова скриня", sapphire: "Сапфірова скриня", ruby: "Рубінова скриня", aurora: "Скриня Aurora", cosmic: "Космічна скриня", mythic: "Міфічна скриня" } },
} as const;

function rewardKind(reward: Reward) {
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
      if (payload.data.opened) notifyMotivationUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setOpening(false);
    }
  }

  if (!milestone) return null;
  const tier: StreakChestTier = streakChestTier(milestone);
  const kind = reward ? rewardKind(reward) : null;
  const kindLabel = kind === "xpCoin" ? text.xpCoin : kind === "hint" ? text.hint : kind === "translation" ? text.translation : text.regular;

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
    <section className={`${styles.card} ${styles[`tier_${tier}`]}`} aria-live="polite">
      <p className={styles.streak}>{text.streak} ×{milestone}</p>
      <button type="button" className={`${styles.chest} ${opening ? styles.opening : ""} ${reward ? styles.opened : ""}`} onClick={() => void openChest()} disabled={opening || Boolean(reward)} aria-label={text.open}>
        <span aria-hidden="true">{tier === "sprout" ? "🎁" : tier === "amber" ? "🧰" : tier === "sapphire" ? "💎" : tier === "ruby" ? "🎁" : tier === "aurora" ? "✨" : tier === "cosmic" ? "🌌" : "👑"}</span>
      </button>
      <span className={styles.tierName}>{text.tiers[tier]}</span>
      {!reward ? <>
        <h3>{text.ready}</h3>
        <p>{text.description}</p>
        <div className={styles.kinds} aria-label={text.kinds}>
          <span className={styles.regular}>✦ XP</span><span className={styles.hint}>☀ XP</span><span className={styles.translation}>✧ XP</span>
          {tier !== "sprout" && tier !== "amber" ? <span className={styles.xpCoinKind}>◈ {text.xpCoin}</span> : null}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button type="button" className={styles.openButton} onClick={() => void openChest()} disabled={opening}>{opening ? text.opening : text.open}</button>
      </> : <>
        <section className={`${styles.reward} ${styles[kind!]}`}>
          <span aria-hidden="true">{kind === "xpCoin" ? "◈" : kind === "hint" ? "☀" : kind === "translation" ? "✧" : "✦"}</span>
          <div><strong>{kindLabel}</strong><p>+{reward.experience} XP{reward.xpCoins ? ` · +${reward.xpCoins.toFixed(2)} XP Coins` : ""}{reward.hintCredits ? ` · +${reward.hintCredits}` : ""}{reward.translationCredits ? ` · +${reward.translationCredits}` : ""}</p></div>
        </section>
        <p className={styles.rewardNote}>{reward.alreadyOpened ? text.already : text.description}</p>
        <button type="button" className={styles.continueButton} onClick={onDismiss}>{text.continue}</button>
      </>}
    </section>
  </AppModal>;
}
