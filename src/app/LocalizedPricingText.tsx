"use client";

import { useLocale } from "@/core/i18n/locale";

type Kind = "type" | "title" | "description" | "period";

const copy: Record<"uk" | "ru", Record<Kind, Record<string, string>>> = {
  ru: {
    type: { "subscription plan": "ПОДПИСКА", course: "КУРС", "course bundle": "НАБОР КУРСОВ" },
    title: { Basic: "Базовый", Corporate: "Корпоративный", Premium: "Премиум", Pro: "Про" },
    description: {
      "Core courses, full vocabulary, and learning progress.": "Основные курсы, полный словарь и отслеживание прогресса.",
      "Organisation-wide Premium access.": "Премиум-доступ для всей организации.",
      "All general and professional courses with advanced analytics.": "Все общие и профессиональные курсы с расширенной аналитикой.",
      "Specialised courses, certificates, and advanced learning tools.": "Специализированные курсы, сертификаты и расширенные инструменты обучения.",
    },
    period: { NONE: "Разовая оплата", MONTH: "Ежемесячно", QUARTER: "Раз в 3 месяца", SEMI_ANNUAL: "Раз в 6 месяцев", YEAR: "Ежегодно" },
  },
  uk: {
    type: { "subscription plan": "ПІДПИСКА", course: "КУРС", "course bundle": "НАБІР КУРСІВ" },
    title: { Basic: "Базовий", Corporate: "Корпоративний", Premium: "Преміум", Pro: "Про" },
    description: {
      "Core courses, full vocabulary, and learning progress.": "Основні курси, повний словник і відстеження прогресу.",
      "Organisation-wide Premium access.": "Преміум-доступ для всієї організації.",
      "All general and professional courses with advanced analytics.": "Усі загальні й професійні курси з розширеною аналітикою.",
      "Specialised courses, certificates, and advanced learning tools.": "Спеціалізовані курси, сертифікати та розширені інструменти навчання.",
    },
    period: { NONE: "Разова оплата", MONTH: "Щомісяця", QUARTER: "Раз на 3 місяці", SEMI_ANNUAL: "Раз на 6 місяців", YEAR: "Щороку" },
  },
};

export function LocalizedPricingText({ kind, value }: { kind: Kind; value: string }) {
  const { locale } = useLocale();
  if (locale === "en") return <>{value}</>;
  return <>{copy[locale][kind][value] ?? value}</>;
}
