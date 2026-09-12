"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import styles from "./StreakChestReward.module.css";

type Reward = {
  opened: boolean;
  alreadyOpened: boolean;
  rewardId: string | null;
  experience: number;
  coins: number;
  hintCredits: number;
  translationCredits: number;
};

const copy = {
  en: { title: "Streak chest", streak: "Streak", ready: "A chest is yours!", description: "Open it to reveal one learning reward.", open: "Open chest", opening: "Opening…", continue: "Continue", hint: "Hint XP", translation: "Translation XP", regular: "XP reward", kinds: "Possible rewards", already: "This chest was already opened.", error: "Could not open the chest. Try again.", close: "Close streak chest" },
  ru: { title: "Сундук стрика", streak: "Стрик", ready: "Вы заработали сундук!", description: "Откройте его и получите одну учебную награду.", open: "Открыть сундук", opening: "Открываем…", continue: "Продолжить", hint: "XP для подсказки", translation: "XP для перевода", regular: "XP-награда", kinds: "Возможные награды", already: "Этот сундук уже был открыт.", error: "Не удалось открыть сундук. Попробуйте ещё раз.", close: "Закрыть сундук стрика" },
  uk: { title: "Скриня стрика", streak: "Стрик", ready: "Ви заробили скриню!", description: "Відкрийте її та отримайте одну навчальну нагороду.", open: "Відкрити скриню", opening: "Відкриваємо…", continue: "Продовжити", hint: "XP для підказки", translation: "XP для перекладу", regular: "XP-нагорода", kinds: "Можливі нагороди", already: "Цю скриню вже було відкрито.", error: "Не вдалося відкрити скриню. Спробуйте ще раз.", close: "Закрити скриню стрика" },
} as const;

function rewardKind(reward: Reward) {
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
  const kind = reward ? rewardKind(reward) : null;
  const kindLabel = kind === "hint" ? text.hint : kind === "translation" ? text.translation : text.regular;

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
    <section className={styles.card} aria-live="polite">
      <p className={styles.streak}>{text.streak} ×{milestone}</p>
      <button type="button" className={`${styles.chest} ${opening ? styles.opening : ""} ${reward ? styles.opened : ""}`} onClick={() => void openChest()} disabled={opening || Boolean(reward)} aria-label={text.open}>
        <span aria-hidden="true">🎁</span>
      </button>
      {!reward ? <>
        <h3>{text.ready}</h3>
        <p>{text.description}</p>
        <div className={styles.kinds} aria-label={text.kinds}>
          <span className={styles.regular}>✦ XP</span><span className={styles.hint}>☀ XP</span><span className={styles.translation}>✧ XP</span>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button type="button" className={styles.openButton} onClick={() => void openChest()} disabled={opening}>{opening ? text.opening : text.open}</button>
      </> : <>
        <section className={`${styles.reward} ${styles[kind!]}`}>
          <span aria-hidden="true">{kind === "hint" ? "☀" : kind === "translation" ? "✧" : "✦"}</span>
          <div><strong>{kindLabel}</strong><p>+{reward.experience} XP{reward.hintCredits ? ` · +${reward.hintCredits}` : ""}{reward.translationCredits ? ` · +${reward.translationCredits}` : ""}</p></div>
        </section>
        <p className={styles.rewardNote}>{reward.alreadyOpened ? text.already : text.description}</p>
        <button type="button" className={styles.continueButton} onClick={onDismiss}>{text.continue}</button>
      </>}
    </section>
  </AppModal>;
}
