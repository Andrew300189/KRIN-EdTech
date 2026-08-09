import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getDevelopmentErrorId,
  getPublicAuthErrorPath,
  getPublicAuthErrorMessage,
  type PublicAuthErrorCode,
} from "@/core/server/auth-error";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
      <section className="w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-red-700">Ошибка авторизации</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {getPublicAuthErrorMessage(code)}
        </h1>
        {errorId ? (
          <p className="mt-4 text-sm text-slate-500">
            Error ID: <code>{errorId}</code>
          </p>
        ) : null}
        <Link
          className="mt-7 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white hover:brightness-95"
          href="/login"
        >
          Вернуться ко входу
        </Link>
      </section>
    </main>
  );
}
