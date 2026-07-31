import Link from "next/link";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Google sign-in was not allowed",
    description:
      "Use a Google account with a verified email address that is not linked to another account.",
  },
  OAuthSignin: {
    title: "Google sign-in could not be started",
    description: "Please try again. If the problem continues, contact support.",
  },
  OAuthCallback: {
    title: "Google sign-in could not be completed",
    description: "The connection was interrupted or expired. Please start again.",
  },
  Configuration: {
    title: "Google sign-in is temporarily unavailable",
    description: "The sign-in service is not configured correctly. Please try again later.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const knownMessage = error ? ERROR_MESSAGES[error] : undefined;
  const message = knownMessage ?? {
    title: "We could not sign you in",
    description: "Please return to the login page and try again.",
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
      <section className="w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-red-700">Authentication error</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{message.title}</h1>
        <p className="mt-4 text-slate-600">{message.description}</p>
        <Link
          className="mt-7 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white hover:brightness-95"
          href="/login"
        >
          Back to login
        </Link>
      </section>
    </main>
  );
}
