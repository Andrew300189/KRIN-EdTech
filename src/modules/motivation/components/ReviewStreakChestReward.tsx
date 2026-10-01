"use client";

/* eslint-disable @next/next/no-img-element -- Local botanical photos are credited in the collection. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { flowerChestById } from "../utils/flower-chests";
import { flowerPhotoById } from "../utils/flower-photo";
import styles from "./ReviewStreakChestReward.module.css";

export type ReviewChest = { flowerId: string; experience: number; waterLily: number; milestone: number };

export function ReviewStreakChestReward({ chest, onClose }: { chest: ReviewChest | null; onClose: () => void }) {
  const { locale } = useLocale();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [chest]);
  if (!chest) return null;
  const flower = flowerChestById(chest.flowerId);
  const photo = flowerPhotoById(chest.flowerId);
  const title = locale === "uk" ? "Скриня за виправлення" : locale === "ru" ? "Сундук за исправления" : "Correction streak chest";
  const open = locale === "uk" ? "Відкрити квітку" : locale === "ru" ? "Открыть цветок" : "Open flower";
  const next = locale === "uk" ? "Далі" : locale === "ru" ? "Далее" : "Continue";
  return <AppModal open onOpenChange={(value) => { if (!value) onClose(); }} title={title} description={`${chest.milestone} ✓`} size="small" closeLabel={next}>
    <div className={styles.reveal}>
      <img key={revealed ? chest.flowerId : "bud"} className={!revealed ? styles.pending : ""} src={revealed && photo ? photo.src : "/flower-chests/mystery-bud.png"} alt={revealed ? flower?.names[locale] ?? flower?.names.en ?? "Flower" : ""} />
      {revealed ? <><strong>{flower?.names[locale] ?? flower?.names.en ?? chest.flowerId}</strong><p>+{chest.experience} XP · +{chest.waterLily} 🪷</p><Link href="/student/flowers">{locale === "uk" ? "Альбом квітів" : locale === "ru" ? "Альбом цветов" : "Flower album"}</Link><button type="button" onClick={onClose}>{next}</button></> : <button type="button" onClick={() => setRevealed(true)}>{open}</button>}
    </div>
  </AppModal>;
}
