"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { publicUiTranslations } from "./public-ui-translations";

export const supportedLocales = [
  "en",
  "uk",
  "ru",
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "en";

/** A value is written here only after a visitor deliberately chooses a language. */
const PREFERENCE_STORAGE_KEY = "krin-locale-preference";
const LEGACY_STORAGE_KEY = "user_lang";

export const localeNames: Record<string, string> = {
  en: "English",
  uk: "Українська",
  ru: "Русский",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  pt: "Português",
  pl: "Polski",
};

export function normalizeLocale(value?: string | null): SupportedLocale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase();
  if (supportedLocales.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  const matched = supportedLocales.find((locale) => locale === normalized.split("-")[0]);
  return matched ?? defaultLocale;
}

export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === "undefined") return defaultLocale;
  const preferred = navigator.language || navigator.languages?.[0];
  return normalizeLocale(preferred);
}

export function readStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return defaultLocale;

  try {
    const stored = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }

    // Keep a language selected in the previous interface version. This is a
    // one-time compatibility read; automatic browser detection is never
    // persisted as a manual preference.
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return normalizeLocale(legacy);
  } catch {
    // Storage may be unavailable in private browsing or restrictive contexts.
  }

  return detectBrowserLocale();
}

const translations: Record<string, Record<string, string>> = {
  en: {
    ...publicUiTranslations.en,
    "header.courses": "Courses",
    "header.pricing": "Pricing",
    "header.levels": "Levels",
    "header.iTeach": "I teach",
    "header.logIn": "Log in",
    "header.cms": "CMS",
    "header.language": "Language",
    "header.navigation": "Navigation",
    "header.learn": "Learn",
    "header.buildSkill": "Build a skill",
    "header.more": "More",
    "header.createAccount": "Create account",
    "header.teacher": "I am a teacher",
    "header.note": "Choose English, Ukrainian or Russian at any time. Your choice is saved on this device.",
    "header.profile": "Open profile",
    "header.openMenu": "Open navigation menu",
    "header.closeMenu": "Close navigation menu",
    "header.browseLevels": "Browse all levels or choose one below.",
    "header.platform": "Platform",
    "header.managePlatform": "Manage platform content and settings.",
    "header.skill.vocabulary": "Vocabulary",
    "header.skill.grammar": "Grammar",
    "header.skill.use-of-english": "Use of English",
    "hero.eyebrow": "English courses A1–C2",
    "hero.title": "Choose an English course with a clear next step.",
    "hero.copy": "Explore published courses by level and focus, try a real lesson exercise, then continue from your own learning dashboard.",
    "hero.searchPlaceholder": "Search courses, lessons and topics",
    "hero.findCourse": "Find my course",
    "hero.browseLevels": "Browse levels",
    "search.label": "Search",
    "search.button": "Search",
    "search.clear": "Clear",
    "search.globalAria": "Global search",
    "search.suggestions": "Search suggestions",
    "search.empty.initial": "Type a query to search.",
    "search.empty.minimum": "Type at least two characters.",
    "search.empty.noResults": "No results for “{query}”",
    "search.loading": "Searching…",
    "search.error": "Unable to perform search.",
    "search.retry": "Retry",
    "search.allResults": "Show all results",
    "search.dialog.title": "Search",
    "search.dialog.description": "Find courses, lessons and learning materials.",
    "search.dialog.close": "Close search",
    "tabs.heading": "Explore what you will achieve at each level.",
    "tabs.sub": "Click a CEFR level to preview the skills and outcomes you will gain from published courses.",
    "tabs.level": "Level",
    "tabs.exploreCourses": "Explore {count} {level} {courseWord} →",
    "tabs.course": "course",
    "tabs.courses": "courses",
    "tabs.samplePath": "Sample learning path",
    "tabs.path.placement": "Placement & orientation",
    "tabs.path.grammar": "Core grammar foundations",
    "tabs.path.vocabulary": "Vocabulary & reading skills",
    "tabs.path.speaking": "Speaking & listening practice",
    "tabs.path.assessment": "Final assessment & certificate",
    "reviews.heading": "Real results from real learners.",
    "reviews.sub": "Join thousands of students who have levelled up their English on KRIN EdTech and changed their careers.",
    "reviews.featured": "featured reviews",
    "reviews.navigation": "Testimonials navigation",
    "reviews.previous": "Previous testimonial",
    "reviews.next": "Next testimonial",
    "reviews.item": "Testimonial {number}",
    "stats.label": "Platform statistics",
    "stats.learners": "Learners registered",
    "stats.words": "Words mastered",
    "stats.courses": "Courses completed",
    "stats.lessons": "Lessons completed",
  },
  uk: {
    ...publicUiTranslations.uk,
    "header.courses": "Курси",
    "header.pricing": "Ціни",
    "header.levels": "Рівні",
    "header.iTeach": "Я викладаю",
    "header.logIn": "Увійти",
    "header.cms": "CMS",
    "header.language": "Мова",
    "header.navigation": "Навігація",
    "header.learn": "Навчання",
    "header.buildSkill": "Розвивайте навички",
    "header.more": "Інше",
    "header.createAccount": "Створити акаунт",
    "header.teacher": "Я вчитель",
    "header.note": "Обирайте англійську, українську або російську будь-коли. Вибір збережеться на цьому пристрої.",
    "header.profile": "Відкрити профіль",
    "header.openMenu": "Відкрити меню навігації",
    "header.closeMenu": "Закрити меню навігації",
    "header.browseLevels": "Перегляньте всі рівні або виберіть один нижче.",
    "header.platform": "Платформа",
    "header.managePlatform": "Керуйте контентом і налаштуваннями платформи.",
    "header.skill.vocabulary": "Словниковий запас",
    "header.skill.grammar": "Граматика",
    "header.skill.use-of-english": "Практика англійської",
    "hero.eyebrow": "Курси англійської A1–C2",
    "hero.title": "Виберіть курс англійської з чітким наступним кроком.",
    "hero.copy": "Досліджуйте опубліковані курси за рівнем і напрямом, спробуйте реальне заняття й продовжуйте з особистої панелі навчання.",
    "hero.searchPlaceholder": "Шукайте курси, уроки та теми",
    "hero.findCourse": "Знайти мій курс",
    "hero.browseLevels": "Переглянути рівні",
    "search.label": "Пошук",
    "search.button": "Шукати",
    "search.clear": "Очистити",
    "search.globalAria": "Глобальний пошук",
    "search.suggestions": "Підказки пошуку",
    "search.empty.initial": "Введіть запит для пошуку.",
    "search.empty.minimum": "Введіть щонайменше два символи.",
    "search.empty.noResults": "За запитом «{query}» нічого не знайдено.",
    "search.loading": "Шукаємо…",
    "search.error": "Не вдалося виконати пошук.",
    "search.retry": "Повторити",
    "search.allResults": "Показати всі результати",
    "search.dialog.title": "Пошук",
    "search.dialog.description": "Знаходьте курси, уроки та навчальні матеріали.",
    "search.dialog.close": "Закрити пошук",
    "tabs.heading": "Дізнайтеся, чого ви досягнете на кожному рівні.",
    "tabs.sub": "Оберіть рівень CEFR, щоб переглянути навички та результати, які дають опубліковані курси.",
    "tabs.level": "Рівень",
    "tabs.exploreCourses": "Переглянути {count} {level} {courseWord} →",
    "tabs.course": "курс",
    "tabs.courses": "курсів",
    "tabs.samplePath": "Приклад навчального шляху",
    "tabs.path.placement": "Визначення рівня та орієнтація",
    "tabs.path.grammar": "Основи граматики",
    "tabs.path.vocabulary": "Словниковий запас і читання",
    "tabs.path.speaking": "Практика говоріння та аудіювання",
    "tabs.path.assessment": "Фінальне оцінювання та сертифікат",
    "reviews.heading": "Реальні результати реальних учнів.",
    "reviews.sub": "Долучайтеся до тисяч студентів, які підвищили рівень англійської з KRIN EdTech і змінили свою кар’єру.",
    "reviews.featured": "відгуків",
    "reviews.navigation": "Навігація відгуками",
    "reviews.previous": "Попередній відгук",
    "reviews.next": "Наступний відгук",
    "reviews.item": "Відгук {number}",
    "stats.label": "Статистика платформи",
    "stats.learners": "Зареєстрованих учнів",
    "stats.words": "Вивчених слів",
    "stats.courses": "Завершених курсів",
    "stats.lessons": "Завершених уроків",
  },
  ru: {
    ...publicUiTranslations.ru,
    "header.courses": "Курсы",
    "header.pricing": "Цены",
    "header.levels": "Уровни",
    "header.iTeach": "Я преподаю",
    "header.logIn": "Войти",
    "header.cms": "CMS",
    "header.language": "Язык",
    "header.navigation": "Навигация",
    "header.learn": "Обучение",
    "header.buildSkill": "Развивайте навык",
    "header.more": "Ещё",
    "header.createAccount": "Создать аккаунт",
    "header.teacher": "Я учитель",
    "header.note": "Выбирайте английский, украинский или русский в любое время. Выбор сохранится на этом устройстве.",
    "header.profile": "Открыть профиль",
    "header.openMenu": "Открыть меню навигации",
    "header.closeMenu": "Закрыть меню навигации",
    "header.browseLevels": "Посмотрите все уровни или выберите один ниже.",
    "header.platform": "Платформа",
    "header.managePlatform": "Управляйте контентом и настройками платформы.",
    "header.skill.vocabulary": "Словарный запас",
    "header.skill.grammar": "Грамматика",
    "header.skill.use-of-english": "Практика английского",
    "hero.eyebrow": "Курсы английского A1–C2",
    "hero.title": "Выберите курс английского языка с понятным следующим шагом.",
    "hero.copy": "Изучайте опубликованные курсы по уровню и направлению, попробуйте реальное упражнение и продолжайте обучение в личной панели.",
    "hero.searchPlaceholder": "Ищите курсы, уроки и темы",
    "hero.findCourse": "Найти мой курс",
    "hero.browseLevels": "Смотреть уровни",
    "search.label": "Поиск",
    "search.button": "Найти",
    "search.clear": "Очистить",
    "search.globalAria": "Глобальный поиск",
    "search.suggestions": "Подсказки поиска",
    "search.empty.initial": "Введите запрос для поиска.",
    "search.empty.minimum": "Введите не менее двух символов.",
    "search.empty.noResults": "По запросу «{query}» ничего не найдено.",
    "search.loading": "Ищем…",
    "search.error": "Не удалось выполнить поиск.",
    "search.retry": "Повторить",
    "search.allResults": "Показать все результаты",
    "search.dialog.title": "Поиск",
    "search.dialog.description": "Находите курсы, уроки и учебные материалы.",
    "search.dialog.close": "Закрыть поиск",
    "tabs.heading": "Узнайте, чего вы достигнете на каждом уровне.",
    "tabs.sub": "Выберите уровень CEFR, чтобы посмотреть навыки и результаты, которые дают опубликованные курсы.",
    "tabs.level": "Уровень",
    "tabs.exploreCourses": "Посмотреть {count} {level} {courseWord} →",
    "tabs.course": "курс",
    "tabs.courses": "курсов",
    "tabs.samplePath": "Пример учебного пути",
    "tabs.path.placement": "Определение уровня и знакомство",
    "tabs.path.grammar": "Основы грамматики",
    "tabs.path.vocabulary": "Словарный запас и чтение",
    "tabs.path.speaking": "Практика говорения и аудирования",
    "tabs.path.assessment": "Итоговая оценка и сертификат",
    "reviews.heading": "Реальные результаты реальных учеников.",
    "reviews.sub": "Присоединяйтесь к тысячам студентов, которые повысили английский с KRIN EdTech и изменили свою карьеру.",
    "reviews.featured": "отзывов",
    "reviews.navigation": "Навигация по отзывам",
    "reviews.previous": "Предыдущий отзыв",
    "reviews.next": "Следующий отзыв",
    "reviews.item": "Отзыв {number}",
    "stats.label": "Статистика платформы",
    "stats.learners": "Зарегистрированных учеников",
    "stats.words": "Выученных слов",
    "stats.courses": "Завершённых курсов",
    "stats.lessons": "Завершённых уроков",
  },
  es: {
    "header.courses": "Cursos",
    "header.pricing": "Precios",
    "header.levels": "Niveles",
    "header.iTeach": "Yo enseño",
    "header.logIn": "Iniciar sesión",
    "header.cms": "CMS",
    "header.language": "Idioma",
    "header.navigation": "Navegación",
    "header.learn": "Aprender",
    "header.buildSkill": "Desarrolla una habilidad",
    "header.more": "Más",
    "header.createAccount": "Crear cuenta",
    "header.teacher": "Soy profesor",
    "header.note": "Las páginas públicas están disponibles en inglés por ahora. Puedes cambiar el idioma de la cuenta después de iniciar sesión.",
    "hero.eyebrow": "Cursos de inglés A1–C2",
    "hero.title": "Elige un curso de inglés con el siguiente paso claro.",
    "hero.copy": "Explora cursos publicados por nivel y enfoque, prueba una lección real y continúa desde tu panel de aprendizaje.",
    "hero.searchPlaceholder": "Busca cursos, lecciones y temas",
    "hero.findCourse": "Encontrar mi curso",
    "hero.browseLevels": "Ver niveles",
  },
  fr: {
    "header.courses": "Cours",
    "header.pricing": "Tarifs",
    "header.levels": "Niveaux",
    "header.iTeach": "J'enseigne",
    "header.logIn": "Connexion",
    "header.cms": "CMS",
    "header.language": "Langue",
    "header.navigation": "Navigation",
    "header.learn": "Apprendre",
    "header.buildSkill": "Développer une compétence",
    "header.more": "Plus",
    "header.createAccount": "Créer un compte",
    "header.teacher": "Je suis enseignant",
    "header.note": "Les pages publiques sont actuellement en anglais. Vous pouvez définir la langue de votre compte après vous être connecté.",
    "hero.eyebrow": "Cours d'anglais A1–C2",
    "hero.title": "Choisissez un cours d'anglais avec une prochaine étape claire.",
    "hero.copy": "Explorez les cours publiés par niveau et par thème, testez une vraie leçon puis continuez depuis votre tableau de bord.",
    "hero.searchPlaceholder": "Rechercher des cours, leçons et sujets",
    "hero.findCourse": "Trouver mon cours",
    "hero.browseLevels": "Voir les niveaux",
  },
  it: {
    "header.courses": "Corsi",
    "header.pricing": "Prezzi",
    "header.levels": "Livelli",
    "header.iTeach": "Insegno",
    "header.logIn": "Accedi",
    "header.cms": "CMS",
    "header.language": "Lingua",
    "header.navigation": "Navigazione",
    "header.learn": "Apprendi",
    "header.buildSkill": "Sviluppa una competenza",
    "header.more": "Altro",
    "header.createAccount": "Crea account",
    "header.teacher": "Sono insegnante",
    "header.note": "Le pagine pubbliche sono attualmente disponibili in inglese. Puoi impostare la lingua dell'interfaccia dopo l'accesso.",
    "hero.eyebrow": "Corsi di inglese A1–C2",
    "hero.title": "Scegli un corso di inglese con un passo successivo chiaro.",
    "hero.copy": "Esplora i corsi pubblicati per livello e focus, prova una vera lezione e continua dal tuo dashboard di apprendimento.",
    "hero.searchPlaceholder": "Cerca corsi, lezioni e argomenti",
    "hero.findCourse": "Trova il mio corso",
    "hero.browseLevels": "Sfoglia i livelli",
  },
  de: {
    "header.courses": "Kurse",
    "header.pricing": "Preise",
    "header.levels": "Niveaus",
    "header.iTeach": "Ich unterrichte",
    "header.logIn": "Anmelden",
    "header.cms": "CMS",
    "header.language": "Sprache",
    "header.navigation": "Navigation",
    "header.learn": "Lernen",
    "header.buildSkill": "Skill aufbauen",
    "header.more": "Mehr",
    "header.createAccount": "Konto erstellen",
    "header.teacher": "Ich bin Lehrer",
    "header.note": "Öffentliche Seiten sind derzeit auf Englisch verfügbar. Sie können die Sprache der Oberfläche nach dem Anmelden einstellen.",
    "hero.eyebrow": "Englischkurse A1–C2",
    "hero.title": "Wählen Sie einen Englischkurs mit einem klaren nächsten Schritt.",
    "hero.copy": "Entdecken Sie veröffentlichte Kurse nach Niveau und Fokus, testen Sie eine echte Lektion und fahren Sie im Lern-Dashboard fort.",
    "hero.searchPlaceholder": "Kurse, Lektionen und Themen suchen",
    "hero.findCourse": "Meinen Kurs finden",
    "hero.browseLevels": "Niveaus ansehen",
  },
  pt: {
    "header.courses": "Cursos",
    "header.pricing": "Preços",
    "header.levels": "Níveis",
    "header.iTeach": "Eu ensino",
    "header.logIn": "Entrar",
    "header.cms": "CMS",
    "header.language": "Idioma",
    "header.navigation": "Navegação",
    "header.learn": "Aprender",
    "header.buildSkill": "Construir habilidade",
    "header.more": "Mais",
    "header.createAccount": "Criar conta",
    "header.teacher": "Sou professor",
    "header.note": "As páginas públicas estão disponíveis em inglês no momento. Você pode definir o idioma da interface após fazer login.",
    "hero.eyebrow": "Cursos de inglês A1–C2",
    "hero.title": "Escolha um curso de inglês com o próximo passo claro.",
    "hero.copy": "Explore cursos publicados por nível e foco, teste uma lição real e continue no seu painel de aprendizagem.",
    "hero.searchPlaceholder": "Buscar cursos, lições e tópicos",
    "hero.findCourse": "Encontrar meu curso",
    "hero.browseLevels": "Ver níveis",
  },
  pl: {
    "header.courses": "Kursy",
    "header.pricing": "Ceny",
    "header.levels": "Poziomy",
    "header.iTeach": "Nauczam",
    "header.logIn": "Zaloguj się",
    "header.cms": "CMS",
    "header.language": "Język",
    "header.navigation": "Nawigacja",
    "header.learn": "Ucz się",
    "header.buildSkill": "Rozwijaj umiejętności",
    "header.more": "Więcej",
    "header.createAccount": "Utwórz konto",
    "header.teacher": "Jestem nauczycielem",
    "header.note": "Strony publiczne są obecnie dostępne w języku angielskim. Możesz ustawić język interfejsu konta po zalogowaniu.",
    "hero.eyebrow": "Kursy angielskiego A1–C2",
    "hero.title": "Wybierz kurs angielskiego z jasnym następnym krokiem.",
    "hero.copy": "Przeglądaj opublikowane kursy według poziomu i tematu, wypróbuj prawdziwą lekcję i kontynuuj z własnego panelu nauki.",
    "hero.searchPlaceholder": "Szukaj kursów, lekcji i tematów",
    "hero.findCourse": "Znajdź mój kurs",
    "hero.browseLevels": "Przeglądaj poziomy",
  },
};

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (nextLocale: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initialLocale = readStoredLocale();
    setLocaleState(initialLocale);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;

  }, [hydrated, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: (nextLocale: string) => {
      const next = normalizeLocale(nextLocale);
      setLocaleState(next);
      try {
        window.localStorage.setItem(PREFERENCE_STORAGE_KEY, next);
        // The old key remains in sync for integrations that still read it.
        window.localStorage.setItem(LEGACY_STORAGE_KEY, next);
      } catch {
        // A selected language still works for this open page if storage is off.
      }
    },
    t: (key: string, values?: Record<string, string | number>) => {
      const match = translations[locale]?.[key];
      const message = match ?? translations[defaultLocale]?.[key] ?? key;
      return values
        ? message.replace(/\{(\w+)\}/g, (token, name) => String(values[name] ?? token))
        : message;
    },
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
