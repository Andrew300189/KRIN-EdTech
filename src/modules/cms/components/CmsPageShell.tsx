import type { ReactNode } from "react";

export function CmsPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600">{description}</p>
      </div>
      {actions}
    </header>
    {children}
  </section>;
}

export function CmsEmptyState({ title = "Nothing here yet", description, action }: { title?: string; description: string; action?: ReactNode }) {
  return <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <h2 className="text-lg font-bold text-slate-950">{title}</h2>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </section>;
}
