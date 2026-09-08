"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";
import { PresenceHeartbeat } from "@/core/components/PresenceHeartbeat";
import { DailyChestHeaderButton } from "@/modules/motivation/components/DailyChestHeaderButton";
import { DailyStreakHeaderStatus } from "@/modules/motivation/components/DailyStreakHeaderStatus";
import { LearningBonusHeaderStatus } from "@/modules/motivation/components/LearningBonusHeaderStatus";
import { LeaderboardHeaderStatus, type LeaderboardHeaderSummary } from "@/modules/motivation/components/LeaderboardHeaderStatus";
import { ExperienceStatus } from "@/modules/motivation/components/ExperienceStatus";
import { useLocale } from "@/core/i18n/locale";
import type { NotificationBadgeSection } from "@/modules/communications/types/navigation-badges";
import type { SearchContext } from "@/modules/search/types";
import styles from "./WorkspaceShell.module.css";

type WorkspaceNavigationItem = {
  href: string;
  label: string;
  labelKey?: string;
  notificationSection?: NotificationBadgeSection;
};

type WorkspaceShellProps = {
  title: string;
  navigation: WorkspaceNavigationItem[];
  children: React.ReactNode;
  searchContext?: SearchContext;
  showCmsLink?: boolean;
  showExperience?: boolean;
  /** A learner's own profile photo takes precedence over a cosmetic avatar. */
  userAvatar?: string | null;
  userInitials?: string;
  shopAvatar?: string | null;
  leaderboardSummary?: LeaderboardHeaderSummary;
  /** Keeps compact student overview pages inside the desktop viewport. */
  lockDesktopViewport?: boolean;
};

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function WorkspaceShell({
  title,
  navigation,
  children,
  searchContext,
  showCmsLink = false,
  showExperience = false,
  userAvatar = null,
  userInitials = "",
  shopAvatar = null,
  leaderboardSummary,
  lockDesktopViewport = false,
}: WorkspaceShellProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const shouldLockDesktopViewport = lockDesktopViewport && (pathname === "/student" || pathname === "/student/achievements");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [navigationBadges, setNavigationBadges] = useState<Partial<Record<NotificationBadgeSection, number>>>({});
  const [openMistakeCount, setOpenMistakeCount] = useState(0);
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const loadNavigationBadges = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/badges", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { badges?: Partial<Record<NotificationBadgeSection, number>>; openMistakeCount?: number } | null;
      if (!response.ok || !payload?.badges) return;
      setNavigationBadges(payload.badges);
      setOpenMistakeCount(Math.max(0, payload.openMistakeCount ?? 0));
    } catch {
      // Badges are a convenience indicator; navigation remains available.
    }
  }, []);

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => drawerRef.current?.focus());

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Force a new document request so no authenticated workspace state is
      // retained in the client router after logout.
      window.location.assign("/");
    }
  };

  const isActive = useCallback((href: string) => {
    if (href === "/student" || href === "/teacher") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }, [pathname]);

  useEffect(() => {
    if (!navigation.some((item) => item.notificationSection)) return;
    void loadNavigationBadges();
    const timer = window.setInterval(() => void loadNavigationBadges(), 60_000);
    window.addEventListener("focus", loadNavigationBadges);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", loadNavigationBadges); };
  }, [loadNavigationBadges, navigation]);

  // Cosmetics are selected through the server-authorized Shop. The last
  // selected theme is mirrored locally purely to avoid a database read on
  // every navigation; ownership is still checked before it can be equipped.
  useEffect(() => {
    try {
      const theme = window.localStorage.getItem("krin-shop-theme");
      if (theme === "theme-aurora" || theme === "theme-sunrise") {
        document.documentElement.dataset.shopTheme = theme;
      }
    } catch {
      // Local storage is optional; the default interface remains available.
    }
  }, []);

  useEffect(() => {
    const updateMistakeCount = (event: Event) => {
      const count = (event as CustomEvent<{ count?: unknown }>).detail?.count;
      if (typeof count === "number" && Number.isFinite(count)) {
        setOpenMistakeCount(Math.max(0, count));
        return;
      }
      void loadNavigationBadges();
    };
    window.addEventListener("mistakes:changed", updateMistakeCount);
    return () => window.removeEventListener("mistakes:changed", updateMistakeCount);
  }, [loadNavigationBadges]);

  useEffect(() => {
    const section = navigation.find((item) => item.notificationSection && isActive(item.href))?.notificationSection;
    if (!section) return;
    void fetch("/api/notifications/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) })
      .then((response) => { if (response.ok) setNavigationBadges((current) => ({ ...current, [section]: 0 })); })
      .catch(() => undefined);
  }, [isActive, navigation, pathname]);

  useEffect(() => {
    // A newly saved photo may replace a previously broken external URL.
    setProfilePhotoFailed(false);
  }, [userAvatar]);

  const sidebar = (isMobileDrawer = false) => (
    <aside
      ref={isMobileDrawer ? drawerRef : undefined}
      aria-label={title.trim() ? `${title} ${t("workspace.navigation")}` : t("workspace.navigation")}
      className={styles.sidebar}
      tabIndex={isMobileDrawer ? -1 : undefined}
    >
      <div className={styles.brandBlock}>
        <div className={styles.brandRow}>
          <Link
            href="/"
            className={styles.brandLink}
            onClick={() => closeMenu()}
          >
            KRIN EdTech
          </Link>
          {isMobileDrawer ? (
            <button
              className={styles.closeButton}
              type="button"
              onClick={() => closeMenu(true)}
              aria-label={t("workspace.closeNavigation")}
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>
        <p className={styles.workspaceName}>{title}</p>
      </div>

      <nav className={styles.navigation} aria-label={t("workspace.navigation")}>
        {navigation.map((item) => {
          const active = isActive(item.href);
          const mistakeBadgeCount = item.href === "/student/mistakes" ? openMistakeCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => closeMenu()}
              aria-current={active ? "page" : undefined}
              className={`${styles.navigationLink} ${active ? styles.navigationLinkActive : ""}`}
            >
              <span>{item.labelKey ? t(item.labelKey) : item.label}</span>
              {mistakeBadgeCount > 0 ? <span className={styles.navigationCountBadge} aria-label={t("workspace.mistakesToReview", { count: mistakeBadgeCount })}>{mistakeBadgeCount > 99 ? "99+" : mistakeBadgeCount}</span> : null}
              {!mistakeBadgeCount && item.notificationSection && (navigationBadges[item.notificationSection] ?? 0) > 0 ? <span className={styles.navigationBadge} role="img" aria-label={t("workspace.newUpdates")} /> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/" onClick={() => closeMenu()} className={styles.homeLink}>
          <span aria-hidden="true">←</span>
          {t("workspace.backToHome")}
        </Link>
      </div>
    </aside>
  );

  return (
    <div className={styles.workspace}>
      <PresenceHeartbeat />
      <div className={styles.desktopSidebar}>{sidebar()}</div>

      {menuOpen ? (
        <div
          className={styles.mobileMenu}
          role="dialog"
          aria-modal="true"
          aria-label={t("workspace.navigation")}
        >
          <button
            className={styles.menuBackdrop}
            type="button"
            aria-label={t("workspace.closeNavigation")}
            onClick={() => closeMenu(true)}
          />
          <div className={styles.mobileDrawer}>{sidebar(true)}</div>
        </div>
      ) : null}

      <main className={`${styles.main} ${shouldLockDesktopViewport ? styles.viewportLockedMain : ""}`}>
        <header className={`${styles.header} ${shouldLockDesktopViewport ? styles.viewportLockedHeader : ""} ${title.trim() ? "" : styles.headerCompact}`}>
          <div className={styles.headerRow}>
            <div className={styles.headerTitle}>
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={t("workspace.openNavigation")}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className={styles.menuButton}
              >
                <MenuIcon />
              </button>
              {title.trim() ? <h1>{title}</h1> : null}
            </div>

            <div className={styles.headerActions}>
              {leaderboardSummary ? <LeaderboardHeaderStatus summary={leaderboardSummary} /> : null}
              <DailyStreakHeaderStatus />
              <LearningBonusHeaderStatus />
              <DailyChestHeaderButton />
              {userAvatar && !profilePhotoFailed ? <img
                src={userAvatar}
                alt={userInitials ? `${userInitials} profile photo` : "Profile photo"}
                className={styles.profileAvatar}
                onError={() => setProfilePhotoFailed(true)}
              /> : shopAvatar === "avatar-fox" || shopAvatar === "avatar-owl" ? <span className={styles.shopAvatar} role="img" aria-label={shopAvatar === "avatar-fox" ? "Fox avatar" : "Owl avatar"}>{shopAvatar === "avatar-fox" ? "🦊" : "🦉"}</span> : null}
              {showExperience ? <ExperienceStatus /> : null}
              {showCmsLink ? (
                <Link href="/cms" className={styles.cmsLink}>
                  CMS
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                className={styles.signOutButton}
                disabled={isSigningOut}
              >
                {isSigningOut ? t("workspace.signingOut") : t("workspace.signOut")}
              </button>
            </div>
          </div>

          {searchContext ? (
            <div className={styles.search}>
              <GlobalSearch
                compact
                context={searchContext}
                dialogUntil="lg"
                placeholder={
                  searchContext === "TEACHER"
                    ? t("workspace.teacherSearch")
                    : t("workspace.studentSearch")
                }
              />
            </div>
          ) : null}
        </header>

        <div className={`${styles.content} ${shouldLockDesktopViewport ? styles.viewportLockedContent : ""}`}>{children}</div>
      </main>
    </div>
  );
}
