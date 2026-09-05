"use client";

import { useLocale } from "./locale";

const localizedLevelTitles = {
  uk: {
    A1: "Початковий",
    A2: "Елементарний",
    B1: "Середній",
    B2: "Вище середнього",
    C1: "Просунутий",
    C2: "Вільне володіння",
  },
  ru: {
    A1: "Начальный",
    A2: "Элементарный",
    B1: "Средний",
    B2: "Выше среднего",
    C1: "Продвинутый",
    C2: "Свободное владение",
  },
} as const;

export function LocalizedCefrLevelLabel({
  code,
  fallback,
}: {
  code: string;
  fallback: string;
}) {
  const { locale } = useLocale();
  const title = locale === "en"
    ? fallback
    : localizedLevelTitles[locale][code as keyof typeof localizedLevelTitles.ru] ?? fallback;

  return <>{code} · {title}</>;
}
