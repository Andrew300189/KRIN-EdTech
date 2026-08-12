import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";

export const legalDocumentKeys = ["terms", "privacy", "payments", "refunds", "organization"] as const;
export type LegalDocumentKey = (typeof legalDocumentKeys)[number];

const definitions: Record<LegalDocumentKey, { title: string; description: string }> = {
  terms: { title: "Terms of use", description: "Terms for using KRIN EdTech." },
  privacy: { title: "Privacy policy", description: "How KRIN EdTech handles personal information." },
  payments: { title: "Payment rules", description: "Payment and access conditions for KRIN EdTech." },
  refunds: { title: "Refund policy", description: "Refund conditions for KRIN EdTech." },
  organization: { title: "Organisation and contacts", description: "Verified organisation and support contact information for KRIN EdTech." },
};

function text(content: unknown, key: string) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isLegalDocumentKey(value: string): value is LegalDocumentKey {
  return legalDocumentKeys.includes(value as LegalDocumentKey);
}

export async function legalMetadata(document: LegalDocumentKey): Promise<Metadata> {
  const slot = await getPublishedCmsContentSlot(`legal.${document}`);
  const definition = definitions[document];
  const title = text(slot?.content, "heading") ?? slot?.title ?? definition.title;
  const description = text(slot?.content, "summary") ?? definition.description;
  return { title, description, alternates: { canonical: `/legal/${document}` } };
}

export async function LegalDocumentPage({ document }: { document: LegalDocumentKey }) {
  const slot = await getPublishedCmsContentSlot(`legal.${document}`);
  const definition = definitions[document];
  const heading = text(slot?.content, "heading") ?? slot?.title ?? definition.title;
  const body = text(slot?.content, "body");
  const contactEmail = text(slot?.content, "contactEmail");
  const paragraphs = body?.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean) ?? [];

  return <main className="min-h-screen bg-slate-50"><PublicSiteHeader /><div className="mx-auto max-w-3xl px-6 py-12">
    <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">← KRIN EdTech</Link>
    <header className="mt-6 border-b border-slate-200 pb-7"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Legal and trust</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{heading}</h1>{slot?.publishedAt ? <p className="mt-3 text-sm text-slate-600">Last published: {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(slot.publishedAt)}</p> : null}</header>
    {paragraphs.length ? <article className="space-y-5 py-8 text-base leading-8 text-slate-700">{paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}</article> : <section className="my-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><h2 className="text-xl font-bold">This document has not been published yet.</h2><p className="mt-2">The platform operator has not provided public information for this policy. Please contact support before relying on it or completing a purchase.</p></section>}
    {contactEmail ? <p className="border-t border-slate-200 pt-6 text-sm text-slate-600">Questions about this document: <a className="font-semibold text-blue-700 hover:underline" href={`mailto:${contactEmail}`}>{contactEmail}</a></p> : <p className="border-t border-slate-200 pt-6 text-sm text-slate-600">Need help? <Link className="font-semibold text-blue-700 hover:underline" href="/help">Open the help center</Link>.</p>}
  </div></main>;
}

export function requireLegalDocument(value: string) {
  if (!isLegalDocumentKey(value)) notFound();
  return value;
}
