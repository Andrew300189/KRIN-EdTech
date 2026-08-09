export default function CmsLoading() {
  return <main className="mx-auto max-w-7xl animate-pulse space-y-6 px-6 py-8" aria-busy="true" aria-label="Loading CMS content">
    <div className="h-5 w-32 rounded bg-slate-200" />
    <div className="h-10 w-72 rounded bg-slate-200" />
    <div className="h-24 rounded-2xl bg-slate-100" />
    <div className="h-64 rounded-2xl bg-slate-100" />
  </main>;
}
