"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { ThemeToggle } from "@/core/components/ThemeToggle";
import {
  localeNames,
  supportedLocales,
  useLocale,
} from "@/core/i18n/locale";
import { LoginModal } from "@/modules/auth/components/LoginModal";
import { courseSkillCatalog, courseSkillLevels, type CourseSkillSlug } from "@/modules/courses/data/skill-course-catalog";
import styles from "./PublicSiteHeader.module.css";

const levelOrder = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const primaryLinks = [
  { href: "/#courses", label: "Courses" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#levels", label: "Levels" },
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

function getSkillHref(skillSlug: CourseSkillSlug, level?: CefrLevel) {
  const pathname = `/courses/skills/${skillSlug}`;
  return level ? `${pathname}?level=${level}` : pathname;
}

function SkillMenu({ skill }: { skill: CourseSkill }) {
  return <div className={styles.skillMenu}>
    <Link href={getSkillHref(skill.slug)} className={styles.skillTrigger}>{skill.label}</Link>
    <div className={styles.skillDropdown} aria-label={`${skill.label} courses by level`}>
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

/** Shared public navigation with keyboard-accessible skill and mobile menus. */
export function PublicSiteHeader() {
  const { locale, setLocale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntent, setLoginIntent] = useState<"learner" | "teacher">("learner");
  const [loginInitialView, setLoginInitialView] = useState<"login" | "register">("login");
  const [canAccessCms, setCanAccessCms] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

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
        };

        if (active && response.ok && payload.authenticated) {
          setCanAccessCms(payload.canAccessCms === true);
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

  const openLogin = (intent: "learner" | "teacher", initialView: "login" | "register" = "login") => {
    setLoginIntent(intent);
    setLoginInitialView(initialView);
    setLoginOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label="KRIN EdTech home">
        <img
          src="/icons/a-detailed-flat-vector-illustration-of-a-single-wh.svg"
          alt="KRIN EdTech logo"
          className={styles.brandLogo}
        />
        <span className={styles.brandText}>
          <span className={styles.brandBase}>KRIN</span>
          <span className={styles.brandDot}>·</span>
          <span className={styles.brandAccent}>EdTech</span>
        </span>
      </Link>
      <nav className={styles.desktopNav} aria-label={t("header.navigation")}>
        {primaryLinks.map((link) => <Link key={link.href} href={link.href}>{t(`header.${link.label.toLowerCase()}`)}</Link>)}
        {courseSkillCatalog.map((skill) => <SkillMenu key={skill.slug} skill={skill} />)}
      </nav>
      <div className={styles.desktopActions}>
        <button type="button" className={styles.teacherLink} onClick={() => openLogin("teacher")}>{t("header.iTeach")}</button>
        <ThemeToggle />
        {canAccessCms ? <Link href="/cms" className={styles.cmsLink}>{t("header.cms")}</Link> : null}
        <button type="button" className={styles.loginLink} onClick={() => openLogin("learner")}>{t("header.logIn")}</button>
        <label className={styles.localeSelectWrap}>
          <select
            aria-label="Language"
            className={styles.localeSelect}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            {supportedLocales.map((supportedLocale) => (
              <option key={supportedLocale} value={supportedLocale}>
                {supportedLocale.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.mobileActions}>
        <ThemeToggle />
        {canAccessCms ? <Link href="/cms" className={styles.mobileCmsLink}>{t("header.cms")}</Link> : null}
        <button type="button" className={styles.mobileLogin} onClick={() => openLogin("learner")}>{t("header.logIn")}</button>
        <label className={styles.localeSelectWrapMobile}>
          <select
            aria-label="Language"
            className={styles.localeSelect}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            {supportedLocales.map((supportedLocale) => (
              <option key={supportedLocale} value={supportedLocale}>
                {supportedLocale.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button ref={triggerRef} type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="public-navigation-menu" onClick={() => setMenuOpen((open) => !open)} className={styles.menuButton}><MenuIcon open={menuOpen} /></button>
      </div>
    </div>
    <AppModal open={menuOpen} onOpenChange={setMenuOpen} title={t("header.navigation")} size="fullscreen" className={styles.menuDialog} closeLabel="Close navigation menu">
      <div id="public-navigation-menu" className={styles.panel}>
        <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.learn")}</p>{primaryLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{t(`header.${link.label.toLowerCase()}`)}</span></Link>)}</section>
        <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.buildSkill")}</p>{courseSkillCatalog.map((skill) => <div key={skill.slug} className={styles.mobileSkillGroup}><Link href={getSkillHref(skill.slug)} onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{skill.label}</span><span className={styles.menuDescription}>Browse all levels or choose one below.</span></Link><div className={styles.mobileLevelLinks}>{courseSkillLevels.map((level) => <Link key={level} href={getSkillHref(skill.slug, level)} onClick={closeMenu} data-tone={levelToneMap[level as CefrLevel]}>{level}</Link>)}</div></div>)}</section>
        <section className={styles.menuSection}><p className={styles.menuHeading}>{t("header.more")}</p>{moreLinks.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{link.label}</span><span className={styles.menuDescription}>{link.description}</span></Link>)}</section>
        {canAccessCms ? <section className={styles.menuSection}><p className={styles.menuHeading}>Platform</p><Link href="/cms" onClick={closeMenu} className={styles.menuLink}><span className={styles.menuTitle}>{t("header.cms")}</span><span className={styles.menuDescription}>Manage platform content and settings.</span></Link></section> : null}
        <div className={styles.menuCtas}><button type="button" onClick={() => { closeMenu(); openLogin("learner", "register"); }} className={styles.menuPrimary}>{t("header.createAccount")}</button><button type="button" onClick={() => { closeMenu(); openLogin("teacher"); }} className={styles.menuSecondary}>{t("header.teacher")}</button></div>
        <p className={styles.menuNote}>{t("header.note")}</p>
      </div>
    </AppModal>
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} intent={loginIntent} initialView={loginInitialView} nextPath={loginIntent === "teacher" ? "/teacher" : undefined} />
  </header>;
}
