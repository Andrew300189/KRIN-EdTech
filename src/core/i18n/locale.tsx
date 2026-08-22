"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const supportedLocales = [
  "en",
  "uk",
  "ru",
  "es",
  "fr",
  "it",
  "de",
  "pt",
  "pl",
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "en";

const STORAGE_KEY = "user_lang";

export const localeNames: Record<SupportedLocale, string> = {
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
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }
  } catch {
    // Storage may be unavailable in private browsing or restrictive contexts.
  }

  return detectBrowserLocale();
}

const translations: Record<
  SupportedLocale,
  Record<string, string>
> = {
  en: {
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
    "header.note": "Public pages are currently available in English. You can set your account interface language after signing in.",
    "hero.eyebrow": "English courses A1–C2",
    "hero.title": "Choose an English course with a clear next step.",
    "hero.copy": "Explore published courses by level and focus, try a real lesson exercise, then continue from your own learning dashboard.",
    "hero.searchPlaceholder": "Search courses, lessons and topics",
    "hero.findCourse": "Find my course",
    "hero.browseLevels": "Browse levels",
  },
  uk: {
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
    "header.note": "Публічні сторінки зараз доступні англійською. Мову інтерфейсу акаунта можна змінити після входу.",
    "hero.eyebrow": "Курси англійської A1–C2",
    "hero.title": "Виберіть курс англійської з чітким наступним кроком.",
    "hero.copy": "Досліджуйте опубліковані курси за рівнем і напрямом, спробуйте реальне заняття й продовжуйте з особистої панелі навчання.",
    "hero.searchPlaceholder": "Шукайте курси, уроки та теми",
    "hero.findCourse": "Знайти мій курс",
    "hero.browseLevels": "Переглянути рівні",
  },
  ru: {
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
    "header.note": "Публичные страницы сейчас доступны на английском. Язык интерфейса аккаунта можно настроить после входа.",
    "hero.eyebrow": "Курсы английского A1–C2",
    "hero.title": "Выберите курс английского языка с понятным следующим шагом.",
    "hero.copy": "Изучайте опубликованные курсы по уровню и направлению, попробуйте реальное упражнение и продолжайте обучение в личной панели.",
    "hero.searchPlaceholder": "Ищите курсы, уроки и темы",
    "hero.findCourse": "Найти мой курс",
    "hero.browseLevels": "Смотреть уровни",
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
  t: (key: string) => string;
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

    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore unsupported storage access.
    }
  }, [hydrated, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: (nextLocale: string) => {
      setLocaleState(normalizeLocale(nextLocale));
    },
    t: (key: string) => {
      const match = translations[locale]?.[key];
      return match ?? translations[defaultLocale]?.[key] ?? key;
    },
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
