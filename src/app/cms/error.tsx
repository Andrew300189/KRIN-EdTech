"use client";

export default function CmsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-6 py-16">
    <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-7 text-rose-950">
      <p className="text-sm font-semibold uppercase tracking-wide">CMS error</p>
      <h1 className="mt-2 text-2xl font-bold">This CMS page could not be loaded.</h1>
      <p className="mt-3 text-sm leading-6">No content was changed. Try loading the page again; if the problem remains, check the audit log and server logs.</p>
      <button type="button" onClick={reset} className="mt-5 rounded-lg bg-rose-800 px-4 py-2 font-semibold text-white hover:bg-rose-900">Try again</button>
    </section>
  </main>;
}
