"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";
import { PresenceHeartbeat } from "@/core/components/PresenceHeartbeat";
import type { NotificationBadgeSection } from "@/modules/communications/types/navigation-badges";
import type { SearchContext } from "@/modules/search/types";
import styles from "./WorkspaceShell.module.css";

type WorkspaceNavigationItem = {
  href: string;
  label: string;
  notificationSection?: NotificationBadgeSection;
};

type WorkspaceShellProps = {
  title: string;
  navigation: WorkspaceNavigationItem[];
  children: React.ReactNode;
  searchContext?: SearchContext;
  showCmsLink?: boolean;
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
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [navigationBadges, setNavigationBadges] = useState<Partial<Record<NotificationBadgeSection, boolean>>>({});
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const loadNavigationBadges = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/badges", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { badges?: Partial<Record<NotificationBadgeSection, number>> } | null;
      if (!response.ok || !payload?.badges) return;
      setNavigationBadges(Object.fromEntries(Object.entries(payload.badges).map(([section, count]) => [section, Boolean(count)])) as Partial<Record<NotificationBadgeSection, boolean>>);
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
      router.replace("/");
      router.refresh();
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

  useEffect(() => {
    const section = navigation.find((item) => item.notificationSection && isActive(item.href))?.notificationSection;
    if (!section) return;
    void fetch("/api/notifications/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }) })
      .then((response) => { if (response.ok) setNavigationBadges((current) => ({ ...current, [section]: false })); })
      .catch(() => undefined);
  }, [isActive, navigation, pathname]);

  const sidebar = (isMobileDrawer = false) => (
    <aside
      ref={isMobileDrawer ? drawerRef : undefined}
      aria-label={`${title} navigation`}
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
              aria-label="Close navigation"
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>
        <p className={styles.workspaceName}>{title}</p>
      </div>

      <nav className={styles.navigation} aria-label={`${title} sections`}>
        {navigation.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => closeMenu()}
              aria-current={active ? "page" : undefined}
              className={`${styles.navigationLink} ${active ? styles.navigationLinkActive : ""}`}
            >
              <span>{item.label}</span>
              {item.notificationSection && navigationBadges[item.notificationSection] ? <span className={styles.navigationBadge} role="img" aria-label="New updates" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/" onClick={() => closeMenu()} className={styles.homeLink}>
          <span aria-hidden="true">←</span>
          Back to home
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
          aria-label="Workspace navigation"
        >
          <button
            className={styles.menuBackdrop}
            type="button"
            aria-label="Close navigation"
            onClick={() => closeMenu(true)}
          />
          <div className={styles.mobileDrawer}>{sidebar(true)}</div>
        </div>
      ) : null}

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.headerTitle}>
              <button
                ref={menuButtonRef}
                type="button"
                aria-label="Open navigation"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className={styles.menuButton}
              >
                <MenuIcon />
              </button>
              <h1>{title}</h1>
            </div>

            <div className={styles.headerActions}>
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
                {isSigningOut ? "Signing out…" : "Sign out"}
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
                    ? "Search groups, learners, courses and assignments"
                    : "Search courses, topics, lessons and words"
                }
              />
            </div>
          ) : null}
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
