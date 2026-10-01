"use client";

/* eslint-disable @next/next/no-img-element -- The locally stored photographs are shown beside their attribution. */

import Link from "next/link";
import { useLocale } from "@/core/i18n/locale";
import { FLOWER_CHESTS } from "@/modules/motivation/utils/flower-chests";
import flowerPhotos from "@/modules/motivation/utils/flower-photos.json";
import styles from "./credits.module.css";

const copy = {
  en: {
    back: "Home", title: "Image credits and licenses", intro: "Botanical photographs in the flower collection are credited below. Open each source for the original file and its license history.",
    changed: "Site version: resized and converted for web display.", shareAlike: "This adapted image is available under the linked CC BY-SA license.", source: "Original photograph", license: "License", icons: "Interface icons", iconsCopy: "Some interface icons come from Lucide. Its complete ISC and Feather/MIT notices are available here.", fullLicense: "Read the Lucide license", album: "Flower collection",
  },
  ru: {
    back: "На главную", title: "Авторы изображений и лицензии", intro: "Здесь указаны авторы ботанических фотографий из коллекции цветов. По ссылке на источник можно проверить оригинал и историю лицензии.",
    changed: "Версия для сайта: уменьшена и преобразована для отображения в интернете.", shareAlike: "Эта адаптированная фотография доступна на условиях указанной лицензии CC BY-SA.", source: "Оригинал фотографии", license: "Лицензия", icons: "Значки интерфейса", iconsCopy: "Часть значков интерфейса взята из Lucide. Полные уведомления ISC и Feather/MIT доступны здесь.", fullLicense: "Лицензия Lucide", album: "Коллекция цветов",
  },
  uk: {
    back: "На головну", title: "Автори зображень і ліцензії", intro: "Тут зазначено авторів ботанічних фотографій із колекції квітів. За посиланням на джерело можна перевірити оригінал та історію ліцензії.",
    changed: "Версія для сайту: зменшена й перетворена для відображення в інтернеті.", shareAlike: "Це адаптоване фото доступне на умовах зазначеної ліцензії CC BY-SA.", source: "Оригінал фотографії", license: "Ліцензія", icons: "Значки інтерфейсу", iconsCopy: "Частину значків інтерфейсу взято з Lucide. Повні повідомлення ISC і Feather/MIT доступні тут.", fullLicense: "Ліцензія Lucide", album: "Колекція квітів",
  },
} as const;

const flowerNames = new Map(FLOWER_CHESTS.map((flower) => [flower.id, flower.names]));
const photos = Object.entries(flowerPhotos).sort(([a], [b]) => a.localeCompare(b));

export function CreditsContent() {
  const { locale } = useLocale();
  const text = copy[locale];

  return <div className={styles.page}>
    <header className={styles.intro}>
      <Link href="/" className={styles.back}>← {text.back}</Link>
      <h1>{text.title}</h1>
      <p>{text.intro}</p>
      <Link href="/student/flowers" className={styles.album}>{text.album} →</Link>
    </header>

    <section className={styles.grid} aria-label={text.title}>
      {photos.map(([id, photo]) => <article key={id} className={styles.card}>
        <img src={photo.src} alt="" loading="lazy" />
        <div>
          <h2>{flowerNames.get(id)?.[locale] ?? flowerNames.get(id)?.en ?? id.replace(/-/g, " ")}</h2>
          <p className={styles.artist}>{photo.artist}</p>
          <p className={styles.changed}>{text.changed}</p>
          {photo.license.startsWith("CC BY-SA") && <p className={styles.changed}>{text.shareAlike}</p>}
          <div className={styles.links}>
            <a href={photo.source} target="_blank" rel="noopener noreferrer">{text.source} ↗</a>
            <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{text.license}: {photo.license} ↗</a>
          </div>
        </div>
      </article>)}
    </section>

    <section className={styles.icons}>
      <h2>{text.icons}</h2>
      <p>{text.iconsCopy} <a href="/licenses/lucide-react.txt" target="_blank" rel="noopener noreferrer">{text.fullLicense} ↗</a></p>
    </section>
  </div>;
}
