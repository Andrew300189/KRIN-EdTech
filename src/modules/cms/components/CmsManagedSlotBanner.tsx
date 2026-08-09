import Link from "next/link";

type ManagedSlot = { title: string; content: unknown };

function field(content: unknown, key: string) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeInternalHref(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Renders only a whitelisted JSON shape; CMS text is never interpreted as HTML. */
export function CmsManagedSlotBanner({ slot }: { slot: ManagedSlot | null }) {
  if (!slot) return null;
  const heading = field(slot.content, "heading") ?? slot.title;
  const body = field(slot.content, "body");
  const ctaLabel = field(slot.content, "ctaLabel");
  const ctaHref = safeInternalHref(field(slot.content, "ctaHref"));
  return <section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-7 md:p-9"><p className="text-sm font-semibold text-blue-700">FROM KRIN</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{heading}</h2>{body ? <p className="mt-3 max-w-xl text-slate-600">{body}</p> : null}{ctaLabel && ctaHref ? <Link href={ctaHref} className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">{ctaLabel}</Link> : null}</section>;
}
