import Link from "next/link";

export default function StudentCatalogPage() {
  return <section className="rounded-2xl border bg-white p-8"><h2 className="text-3xl font-bold">Course catalog</h2><p className="mt-3 max-w-2xl text-slate-600">Explore published courses. Free courses can be added to your learning library; paid courses remain protected by their entitlement.</p><Link href="/courses" className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">Open catalog</Link></section>;
}
