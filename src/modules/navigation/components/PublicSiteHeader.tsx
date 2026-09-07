"use client";

/* Profile photos may be HTTPS URLs or database-backed data URLs. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";
import { AppModal } from "@/core/components/AppModal";
import { ThemeToggle } from "@/core/components/ThemeToggle";
import {
  localeNames,
  supportedLocales,
  useLocale,
} from "@/core/i18n/locale";
import { LoginModal } from "@/modules/auth/components/LoginModal";
import { courseSkillCatalog, courseSkillLevels, type CourseSkillSlug } from "@/modules/courses/data/skill-course-catalog";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import styles from "./PublicSiteHeader.module.css";

const levelOrder = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const primaryLinks = [
  { href: "/#all-courses", key: "courses" },
  { href: "/#pricing", key: "pricing" },
  { href: "/#levels", key: "levels" },
] as const;

const levelToneMap: Record<CefrLevel, "green" | "yellow" | "orange" | "pink" | "rose" | "red"> = {
  A1: "green",
  A2: "yellow",
  B1: "orange",
  B2: "pink",
  C1: "rose",
  C2: "red",
};

const moreLinks = [
  { href: "/professional", label: "Professional English", description: "Published courses for professional contexts." },
  { href: "/tests", label: "English tests", description: "Published test and exam-preparation courses." },
  { href: "/teachers", label: "For teachers", description: "Groups, assignments and learner progress." },
  { href: "/help", label: "Help centre", description: "Published learning, account and billing guidance." },
  { href: "/about", label: "About KRIN EdTech", description: "Platform and organization information published by the operator." },
  { href: "/contact", label: "Contact", description: "Published support and organization contacts." },
] as const;

type CourseSkill = (typeof courseSkillCatalog)[number];
type CefrLevel = (typeof courseSkillLevels)[number];
type HeaderUser = {
  role?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  equippedShopAvatar?: string | null;
};

function profileHref(user: HeaderUser) {
  return user.role?.toLowerCase() === "teacher" ? "/teacher" : "/student";
}

function userInitials(user: HeaderUser | null) {
  if (!user) return "";
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim();
  if (initials) return initials.toUpperCase();
  return user.name?.trim().slice(0, 1).toUpperCase() || "U";
}

function shopAvatar(user: HeaderUser) {
  return user.equippedShopAvatar === "avatar-fox" ? "🦊" : user.equippedShopAvatar === "avatar-owl" ? "🦉" : null;
}

function getSkillHref(skillSlug: CourseSkillSlug, level?: CefrLevel) {
  const pathname = `/courses/skills/${skillSlug}`;
  return level ? `${pathname}?level=${level}` : pathname;
}

function SkillMenu({ skill }: { skill: CourseSkill }) {
  const { t } = useLocale();
  const label = t(`header.skill.${skill.slug}`);
  return <div className={styles.skillMenu}>
    <Link href={getSkillHref(skill.slug)} className={styles.skillTrigger}>{label}</Link>
    <div className={styles.skillDropdown} aria-label={`${label} courses by level`}>
      <div className={styles.skillLevelGrid}>
        {courseSkillLevels.map((level) => {
          const tone = levelToneMap[level as CefrLevel];
          return <Link key={level} href={getSkillHref(skill.slug, level)} className={`${styles.skillLevelLink} ${styles[tone]}`}>{level}</Link>;
        })}
      </div>
    </div>
  </div>;
}

function MenuIcon({ open }: { open: boolean }) {
  return <span aria-hidden="true" className={styles.menuIcon}><span className={`${styles.menuLine} ${open ? styles.menuLineOpenFirst : ""}`} /><span className={`${styles.menuLine} ${open ? styles.menuLineOpenMiddle : ""}`} /><span className={`${styles.menuLine} ${open ? styles.menuLineOpenLast : ""}`} /></span>;
}

function LanguagePicker() {
  const { locale, setLocale, t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const selectLocale = (nextLocale: (typeof supportedLocales)[number]) => {
    setLocale(nextLocale);
    setOpen(false);

    // The legacy To Be course provides Russian and Ukrainian content at
    // locale-specific URLs. A language choice on that course must change route,
    // not only the interface preference stored in the browser.
    const canonicalCoursePath = pathname.replace(/^\/(?:uk|ru)(?=\/courses\/verb-to-be-masterclass(?:\/|$))/, "");
    if (!/^\/courses\/verb-to-be-masterclass(?:\/|$)/.test(canonicalCoursePath)) return;
    const targetPath = nextLocale === "uk" || nextLocale === "ru" ? `/${nextLocale}${canonicalCoursePath}` : canonicalCoursePath;
    if (targetPath !== pathname) router.push(targetPath);
  };

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return <div ref={pickerRef} className={styles.localePicker}>
    <button type="button" className={styles.localeButton} aria-label={t("header.language")} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">{locale.toUpperCase()}</span>
    </button>
    {open ? <div className={styles.localeMenu} role="listbox" aria-label={t("header.language")}>
      {supportedLocales.map((supportedLocale) => (
        <button key={supportedLocale} type="button" role="option" aria-selected={locale === supportedLocale} className={`${styles.localeOption} ${locale === supportedLocale ? styles.localeOptionActive : ""}`} onClick={() => selectLocale(supportedLocale)}>
          <span className={styles.localeCode}>{supportedLocale.toUpperCase()}</span>
          <span>{localeNames[supportedLocale]}</span>
        </button>
      ))}
    </div> : null}
  </div>;
}

/** Shared public navigation with keyboard-accessible skill and mobile menus. */
export function PublicSiteHeader() {
  const { locale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntent, setLoginIntent] = useState<"learner" | "teacher">("learner");
  const [loginInitialView, setLoginInitialView] = useState<"login" | "register">("login");
  const [canAccessCms, setCanAccessCms] = useState(false);
  const [headerUser, setHeaderUser] = useState<HeaderUser | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const logoClicks = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const easterEggCopy = locale === "uk"
    ? "Ви знайшли пасхалку KRIN: +500 XP!"
    : locale === "ru"
      ? "Вы нашли пасхалку KRIN: +500 XP!"
      : "You found a KRIN Easter egg: +500 XP!";

  useEffect(() => {
    let active = true;

    const loadCmsAccess = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
        });
        const payload = (await response.json()) as {
          authenticated?: boolean;
          canAccessCms?: boolean;
          user?: HeaderUser | null;
        };

        if (active && response.ok && payload.authenticated) {
          setCanAccessCms(payload.canAccessCms === true);
          setHeaderUser(payload.user ?? null);
        } else if (active) {
          setCanAccessCms(false);
          setHeaderUser(null);
        }
      } catch {
        // The header remains public if the session check is temporarily unavailable.
        // The CMS itself is independently protected on the server.
      }
    };

    void loadCmsAccess();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const theme = window.localStorage.getItem("krin-shop-theme");
      if (theme === "theme-aurora" || theme === "theme-sunrise") {
        document.documentElement.dataset.shopTheme = theme;
      }
    } catch {
      // Cosmetic preference is optional and never blocks public navigation.
    }
  }, []);

  useEffect(() => () => {
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
  }, []);

  async function claimLogoEasterEgg() {
    try {
      const response = await fetch("/api/profile/motivation/easter-egg", { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: { claimed?: boolean; experience?: number } } | null;
      if (response.ok && payload?.data?.claimed && payload.data.experience) {
        toast.success(easterEggCopy, { description: `+${payload.data.experience} XP` });
        notifyMotivationUpdated();
      }
    } catch {
      // A hidden bonus must never interfere with normal logo navigation.
    }
  }

  function handleBrandClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    // Four quick clicks reveal the Easter egg. A normal logo click still goes
    // home after a short delay, while the fourth secret click stays in place to
    // display its reward. The server owns the weekly cooldown and XP credit.
    event.preventDefault();
    logoClicks.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    if (logoClicks.current >= 4) {
      logoClicks.current = 0;
      void claimLogoEasterEgg();
      return;
    }
    logoClickTimer.current = setTimeout(() => {
      logoClicks.current = 0;
      router.push("/");
    }, 360);
  }

  const openLogin = (intent: "learner" | "teacher", initialView: "login" | "register" = "login") => {
    setLoginIntent(intent);
    setLoginInitialView(initialView);
    setLoginOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label="KRIN EdTech home" onClick={handleBrandClick}>
        <span className={styles.brandLogoFrame}>
          <img
            src="/icons/a-detailed-flat-vector-illustration-of-a-single-wh.svg"
            alt="KRIN EdTech logo"
            className={styles.brandLogo}
          />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandBase}>KRIN</span>
          <span className={styles.brandDot}>·</span>
          <span className={styles.brandAccent}>EdTech</span>
        </span>
      </Link>
      <nav className={styles.desktopNav} aria-label={t("header.navigation")}>
        {primaryLinks.map((link) => <Link key={link.href} href={link.href}>{t(`header.${link.key}`)}</Link>)}
        {courseSkillCatalog.map((skill) => <SkillMenu key={skill.slug} skill={skill} />)}
      </nav>
      <div className={styles.desktopActions}>
        <button type="button" className={styles.teacherLink} onClick={() => openLogin("teacher")}>{t("header.iTeach")}</button>
        <ThemeToggle />
        {canAccessCms ? <Link href="/cms" className={styles.cmsLink}>{t("header.cms")}</Link> : null}
        {headerUser ? <Link href={profileHref(headerUser)} className={styles.profileLink} aria-label={t("header.profile")} title={t("header.profile")}>
          {headerUser.avatar ? <img src={headerUser.avatar} alt="" className={styles.profileAvatar} /> : <span aria-hidden="true">{shopAvatar(headerUser) ?? userInitials(headerUser)}</span>}
        </Link> : <button type="button" className={styles.loginLink} onClick={() => openLogin("learner")}>{t("header.logIn")}</button>}
        <LanguagePicker />
      </div>
      <div className={styles.mobileActions}>
        <ThemeToggle />
        {canAccessCms ? <Link href="/cms" className={styles.mobileCmsLink}>{t("header.cms")}</Link> : null}
        {headerUser ? <Link href={profileHref(headerUser)} className={styles.profileLink} aria-label={t("header.profile")} title={t("header.profile")}>
          {headerUser.avatar ? <img src={headerUser.avatar} alt="" className={styles.profileAvatar} /> : <span aria-hidden="true">{shopAvatar(headerUser) ?? userInitials(headerUser)}</span>}
        </Link> : <button type="button" className={styles.mobileLogin} onClick={() => openLogin("learner")}>{t("header.logIn")}</button>}
        <LanguagePicker />
        <button ref={triggerRef} type="button" aria-label={menuOpen ? t("header.closeMenu") : t("header.openMenu")} aria-expanded={menuOpen} aria-controls="public-navigation-menu" onClick={() => setMenuOpen((open) => !open)} className={styles.menuButton}><MenuIcon open={menuOpen} /></button>
      </div>
    </div>
    <AppModal open={menuOpen} onOpenChange={setMenuOpen} title={t("header.navigation")} size="fullscreen" className={styles.menuDialog} closeLabel={t("header.closeMenu")}>
      <div id="public-navigation-menu" className={styles.panel}>
        <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.learn")}</p>{primaryLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{t(`header.${link.key}`)}</span></Link>)}</section>
        <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.buildSkill")}</p>{courseSkillCatalog.map((skill) => <div key={skill.slug} className={styles.mobileSkillGroup}><Link href={getSkillHref(skill.slug)} onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{t(`header.skill.${skill.slug}`)}</span><span className={styles.menuDescription}>{t("header.browseLevels")}</span></Link><div className={styles.mobileLevelLinks}>{courseSkillLevels.map((level) => <Link key={level} href={getSkillHref(skill.slug, level)} onClick={closeMenu} data-tone={levelToneMap[level as CefrLevel]}>{level}</Link>)}</div></div>)}</section>
        <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.more")}</p>{moreLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{link.label}</span><span className={styles.menuDescription}>{link.description}</span></Link>)}</section>
        {canAccessCms ? <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.platform")}</p><Link href="/cms" onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{t("header.cms")}</span><span className={styles.menuDescription}>{t("header.managePlatform")}</span></Link></section> : null}
        <div className={styles.menuCtas}><button type="button" onClick={() => { closeMenu(); openLogin("learner", "register"); }} className={styles.menuPrimary}>{t("header.createAccount")}</button><button type="button" onClick={() => { closeMenu(); openLogin("teacher"); }} className={styles.menuSecondary}>{t("header.teacher")}</button></div>
        <p className={styles.menuNote}>{t("header.note")}</p>
      </div>
    </AppModal>
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} intent={loginIntent} initialView={loginInitialView} nextPath={loginIntent === "teacher" ? "/teacher" : undefined} />
  </header>;
}
