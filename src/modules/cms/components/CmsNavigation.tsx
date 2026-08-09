import Link from "next/link";

const primaryLinks = [
  { href: "/cms", label: "Overview" },
  { href: "/cms/courses", label: "Courses" },
  { href: "/cms/levels", label: "Curriculum" },
  { href: "/cms/exercise-templates", label: "Exercises" },
  { href: "/cms/media", label: "Media library" },
  { href: "/cms/homepage", label: "Homepage" },
  { href: "/cms/import-export", label: "Import & export" },
  { href: "/cms/audit", label: "Audit history" },
] as const;

const moreLinks = [
  { href: "/cms/sections", label: "Sections" },
  { href: "/cms/topics", label: "Topics" },
  { href: "/cms/subtopics", label: "Subtopics" },
  { href: "/cms/modules", label: "Modules" },
  { href: "/cms/lessons", label: "Lessons" },
  { href: "/cms/exercises", label: "Exercises list" },
  { href: "/cms/dashboards", label: "Dashboards" },
  { href: "/cms/navigation", label: "Navigation" },
  { href: "/cms/search", label: "Search" },
  { href: "/cms/translations", label: "Translations" },
  { href: "/cms/revisions", label: "Revisions" },
  { href: "/cms/settings", label: "Settings" },
] as const;

export function CmsNavigation() {
  return <nav aria-label="CMS navigation" className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4">
      <Link href="/cms" className="mr-2 text-lg font-bold text-slate-950">KRIN CMS</Link>
      {primaryLinks.map((link) => <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{link.label}</Link>)}
      <details className="relative"><summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-blue-700">More</summary><div className="absolute right-0 z-20 mt-2 grid w-52 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{moreLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800">{link.label}</Link>)}</div></details>
      <Link href="/student" className="ml-auto text-sm font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Open learner view</Link>
    </div>
  </nav>;
}
