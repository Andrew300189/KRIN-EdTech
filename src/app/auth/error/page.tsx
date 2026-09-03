import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getDevelopmentErrorId,
  getPublicAuthErrorPath,
  getPublicAuthErrorMessage,
  type PublicAuthErrorCode,
} from "@/core/server/auth-error";
import styles from "./page.module.css";

function getPublicErrorCode(error: string | undefined): PublicAuthErrorCode {
  if (error === "cms_access_denied") return "cms_access_denied";
  // NextAuth error names intentionally collapse into one public response.
  // This prevents provider, configuration, and callback internals from being
  // disclosed in the browser.
  return "google_sign_in_failed";
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; errorId?: string }>;
}) {
  const { error, errorId: incomingErrorId } = await searchParams;
  const isPublicErrorCode =
    error === "google_sign_in_failed" || error === "cms_access_denied";
  if (error && !isPublicErrorCode) {
    // Replace the provider's raw callback/configuration identifier in the
    // browser URL before rendering any page content.
    redirect(getPublicAuthErrorPath("google_sign_in_failed"));
  }

  const code = getPublicErrorCode(error);
  const errorId = getDevelopmentErrorId(incomingErrorId);
  const isGoogleError = code === "google_sign_in_failed";

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-error-title">
        <div className={styles.brand} aria-label="KRIN EdTech">
          <span className={styles.brandMark} aria-hidden="true">K</span>
          <span>KRIN EdTech</span>
        </div>

        <div className={styles.iconWrap} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
            <path d="M12 8v4" strokeLinecap="round" />
            <path d="M12 16h.01" strokeLinecap="round" />
            <path d="M10.3 3.85 2.7 17a2 2 0 0 0 1.73 3h15.14A2 2 0 0 0 21.3 17L13.7 3.85a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
          </svg>
        </div>

        <p className={styles.eyebrow}>Вход временно недоступен</p>
        <h1 id="auth-error-title" className={styles.title}>
          {getPublicAuthErrorMessage(code)}
        </h1>
        <p className={styles.description}>
          {isGoogleError
            ? "С вашим аккаунтом всё в порядке. Попробуйте войти ещё раз или используйте email и пароль."
            : "Попробуйте войти снова. Если проблема повторится, обратитесь к владельцу платформы."}
        </p>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/login">
            Вернуться ко входу
          </Link>
          <Link className={styles.secondaryAction} href="/">
            На главную
          </Link>
        </div>

        <div className={styles.tip}>
          <span className={styles.tipDot} aria-hidden="true" />
          <span>Мы не сохраняли ваш пароль и не изменяли данные аккаунта.</span>
        </div>

        {errorId ? (
          <p className={styles.errorId}>
            Код обращения: <code>{errorId}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
