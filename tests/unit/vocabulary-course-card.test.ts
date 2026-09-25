/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { useLocale } from "@/core/i18n/locale";
import { VocabularyCourseCard } from "@/modules/vocabulary/components/VocabularyCourseCard";
import type { PublishedVocabularyCourse } from "@/modules/vocabulary/services/vocabulary-course-catalog.service";

jest.mock("@/core/i18n/locale", () => ({ useLocale: jest.fn() }));

const course = {
  id: "bag-course",
  slug: "a-bag-of-food-vocabulary",
  language: "uk",
  title: "A bag of: 30 фраз про продукти",
  shortDescription: "Український опис",
  difficulty: "A2",
  estimatedDuration: 180,
  level: { code: "A2" },
  translations: [
    { locale: "uk", title: "A bag of: 30 фраз про продукти", shortDescription: "Український опис" },
    { locale: "ru", title: "A bag of: 30 фраз о продуктах", shortDescription: "Русское описание" },
  ],
  modules: [{ lessons: [{ slug: "a-bag-of-food-01" }] }],
  firstLessonSlug: "a-bag-of-food-01",
} as PublishedVocabularyCourse;

function selectLocale(locale: "en" | "uk" | "ru") {
  jest.mocked(useLocale).mockReturnValue({ locale, setLocale: jest.fn(), t: (key) => key });
}

describe("vocabulary course catalogue card", () => {
  it("opens the Ukrainian lesson and copy for Ukrainian learners", () => {
    selectLocale("uk");
    render(createElement(VocabularyCourseCard, { course, variant: "student" }));
    expect(screen.getByRole("heading", { name: "A bag of: 30 фраз про продукти" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Відкрити курс/ })).toHaveAttribute("href", "/uk/courses/a-bag-of-food-vocabulary/lessons/a-bag-of-food-01");
  });

  it("opens the Russian lesson and copy for Russian learners", () => {
    selectLocale("ru");
    render(createElement(VocabularyCourseCard, { course, variant: "profile" }));
    expect(screen.getByRole("heading", { name: "A bag of: 30 фраз о продуктах" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть курс" })).toHaveAttribute("href", "/ru/courses/a-bag-of-food-vocabulary/lessons/a-bag-of-food-01");
  });

  it("uses the source language when the interface is English", () => {
    selectLocale("en");
    render(createElement(VocabularyCourseCard, { course, variant: "student" }));
    expect(screen.getByRole("link", { name: /Open course/ })).toHaveAttribute("href", "/uk/courses/a-bag-of-food-vocabulary/lessons/a-bag-of-food-01");
  });
});
