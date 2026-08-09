import Link from "next/link";

export default function CmsNotFound() {
  return <main className="mx-auto max-w-3xl px-6 py-16"><section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h1 className="text-2xl font-bold text-slate-950">CMS item not found</h1><p className="mt-2 text-slate-600">It may have been archived, deleted, or the address is incorrect.</p><Link href="/cms" className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">Back to CMS</Link></section></main>;
}
