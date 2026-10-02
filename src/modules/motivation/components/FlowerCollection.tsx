"use client";

/* eslint-disable @next/next/no-img-element -- Curated, locally stored botanical photos need their own credits in the album. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { flowerPhotoById } from "@/modules/motivation/utils/flower-photo";
import type { FlowerCollectionEntry } from "@/modules/motivation/services/flower-collection.service";
import styles from "./FlowerCollection.module.css";

type Collection = { flowers: FlowerCollectionEntry[]; discovered: number; total: number; opened: number };
type Filter = "all" | "found" | "missing";

const copy = {
  en: { back: "Back to dashboard", eyebrow: "Your discovery album", title: "Flower collection", dashboard: "See the flowers you have found and discover new ones", albumAction: "Open album", intro: "Open flowers earned from answer streaks. Each new bloom joins your album; duplicates add to its count.", discovered: "Discovered", opened: "Flowers opened", all: "All", found: "Discovered", missing: "Not yet found", secret: "Mystery flower", count: "Collected", foundOn: "First found", how: "Keep learning to earn flower chests. Open each bud to discover which flower is inside.", notFound: "This flower has not bloomed for you yet.", source: "Photo and credit", credits: "All photo credits and licenses", note: "Botanical note", close: "Close flower", rarities: { COMMON: "Common", UNCOMMON: "Uncommon", RARE: "Rare", EPIC: "Epic", LEGENDARY: "Legendary" } },
  ru: { back: "На главную", eyebrow: "Альбом находок", title: "Коллекция цветов", dashboard: "Смотрите собранные цветы и открывайте новые виды", albumAction: "Открыть альбом", intro: "Открывайте цветы за серии правильных ответов. Новый вид попадает в альбом, а повторный цветок увеличивает счётчик.", discovered: "Открыто видов", opened: "Открыто цветов", all: "Все", found: "Собраны", missing: "Не найдены", secret: "Таинственный цветок", count: "В коллекции", foundOn: "Впервые найден", how: "Учитесь дальше, получайте цветочные сундуки и раскрывайте бутоны, чтобы находить новые виды.", notFound: "Этот цветок вам пока не выпадал.", source: "Фото и автор", credits: "Авторы и лицензии всех фотографий", note: "Ботаническая заметка", close: "Закрыть цветок", rarities: { COMMON: "Обычный", UNCOMMON: "Необычный", RARE: "Редкий", EPIC: "Эпический", LEGENDARY: "Легендарный" } },
  uk: { back: "На головну", eyebrow: "Альбом знахідок", title: "Колекція квітів", dashboard: "Дивіться зібрані квіти та відкривайте нові види", albumAction: "Відкрити альбом", intro: "Відкривайте квіти за серії правильних відповідей. Новий вид потрапляє до альбому, а повторна квітка збільшує лічильник.", discovered: "Відкрито видів", opened: "Відкрито квітів", all: "Усі", found: "Зібрані", missing: "Не знайдені", secret: "Таємнича квітка", count: "У колекції", foundOn: "Уперше знайдено", how: "Навчайтеся далі, отримуйте квіткові скрині та розкривайте бутони, щоб знаходити нові види.", notFound: "Ця квітка вам поки не випадала.", source: "Фото й автор", credits: "Автори та ліцензії всіх фотографій", note: "Ботанічна примітка", close: "Закрити квітку", rarities: { COMMON: "Звичайна", UNCOMMON: "Незвичайна", RARE: "Рідкісна", EPIC: "Епічна", LEGENDARY: "Легендарна" } },
} as const;

export function FlowerCollectionLink() {
  const { locale } = useLocale();
  const text = copy[locale];
  return <Link href="/student/flowers" className={styles.dashboardLink}>
    <img src="/flower-chests/mystery-bud.png" alt="" />
    <span><strong>{text.title}</strong><small>{text.dashboard}</small></span>
  </Link>;
}

export function FlowerCollection({ initialCollection }: { initialCollection: Collection }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flowers = useMemo(() => initialCollection.flowers.filter((flower) =>
    filter === "all" || (filter === "found" ? flower.count > 0 : flower.count === 0)), [filter, initialCollection.flowers]);
  const selected = initialCollection.flowers.find((flower) => flower.id === selectedId) ?? null;
  const selectedPhoto = flowerPhotoById(selected?.id);
  const name = (flower: FlowerCollectionEntry) => flower.names[locale] ?? flower.names.ru;
  const dateLocale = locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US";

  return <main className={styles.page}>
    <header className={styles.hero}>
      <Link href="/student" className={styles.back}>← {text.back}</Link>
      <p className={styles.eyebrow}>{text.eyebrow}</p>
      <h1>{text.title}</h1>
      <p>{text.intro}</p>
      <div className={styles.stats}>
        <span><strong>{initialCollection.discovered} / {initialCollection.total}</strong>{text.discovered}</span>
        <span><strong>{initialCollection.opened}</strong>{text.opened}</span>
      </div>
      <div className={styles.progress} role="progressbar" aria-label={text.discovered} aria-valuenow={initialCollection.discovered} aria-valuemin={0} aria-valuemax={initialCollection.total}><span style={{ width: `${Math.round(initialCollection.discovered / initialCollection.total * 100)}%` }} /></div>
    </header>

    <div className={styles.filters} role="group" aria-label={text.title}>
      {(["all", "found", "missing"] as const).map((value) => <button key={value} type="button" className={filter === value ? styles.activeFilter : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{text[value]}</button>)}
    </div>
    <section className={styles.grid} aria-label={text.title}>
      {flowers.map((flower) => {
        const found = flower.count > 0;
        const photo = flowerPhotoById(flower.id);
        return <button type="button" key={flower.id} className={`${styles.tile} ${found ? styles.found : styles.locked}`} data-rarity={flower.rarity} onClick={() => setSelectedId(flower.id)} aria-label={`${found ? name(flower) : text.secret}, ${text.rarities[flower.rarity]}`}>
          <span className={styles.photoFrame}><img src={photo?.src ?? "/flower-chests/mystery-bud.png"} alt="" loading="lazy" /><i aria-hidden="true">{found ? "" : "?"}</i></span>
          <span className={styles.tileText}><strong>{found ? name(flower) : text.secret}</strong><small>{text.rarities[flower.rarity]}</small></span>
          {found ? <span className={styles.quantity}>×{flower.count}</span> : null}
        </button>;
      })}
    </section>
    <Link className={styles.allCredits} href="/credits">{text.credits} →</Link>

    <AppModal open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }} title={selected && selected.count > 0 ? name(selected) : text.secret} closeLabel={text.close} size="small">
      {selected ? <div className={styles.detail} data-rarity={selected.rarity}>
        <div className={`${styles.detailPhoto} ${selected.count ? "" : styles.detailLocked}`}><img src={selectedPhoto?.src ?? "/flower-chests/mystery-bud.png"} alt={selected.count ? name(selected) : ""} /><span aria-hidden="true">{selected.count ? "" : "?"}</span></div>
        <strong className={styles.rarity}>{text.rarities[selected.rarity]}</strong>
        {selected.count ? <>
          <p><strong>{text.count}:</strong> {selected.count}</p>
          <p><strong>{text.foundOn}:</strong> {selected.firstFoundAt ? new Date(selected.firstFoundAt).toLocaleDateString(dateLocale) : "—"}</p>
          {selectedPhoto ? <p className={styles.credit}>{text.source}: <a href={selectedPhoto.source} target="_blank" rel="noopener noreferrer">{selectedPhoto.artist}</a> · <a href={selectedPhoto.licenseUrl} target="_blank" rel="noopener noreferrer">{selectedPhoto.license}</a></p> : null}
          {selectedPhoto?.note ? <p className={styles.credit}><strong>{text.note}:</strong> {selectedPhoto.note[locale]}</p> : null}
        </> : <p>{text.notFound} {text.how}</p>}
      </div> : null}
    </AppModal>
  </main>;
}
