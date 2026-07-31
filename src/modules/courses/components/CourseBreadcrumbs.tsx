import Link from "next/link";

export type Breadcrumb = { label: string; href?: string };
export function CourseBreadcrumbs({ items }: { items: Breadcrumb[] }) {
  return <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-600"><ol className="flex flex-wrap items-center gap-2">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <span aria-hidden="true">→</span>}{item.href ? <Link className="underline decoration-slate-300 underline-offset-4 hover:text-blue-700" href={item.href}>{item.label}</Link> : <span aria-current="page" className="font-medium text-slate-900">{item.label}</span>}</li>)}</ol></nav>;
}
