import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import styles from "../public-info.module.css";

export const metadata: Metadata = { title: "About KRIN EdTech", description: "Published information about KRIN EdTech, its learning experience and platform operator.", alternates: { canonical: "/about" } };

function field(content: unknown, key: string) { if (!content || typeof content !== "object" || Array.isArray(content)) return null; const value = (content as Record<string, unknown>)[key]; return typeof value === "string" && value.trim() ? value.trim() : null; }

export default async function AboutPage() {
  const slot = await getPublishedCmsContentSlot("about.platform");
  const heading = field(slot?.content, "heading") ?? slot?.title;
  const body = field(slot?.content, "body");
  return <main className={styles.page}><PublicSiteHeader /><div className={`${styles.container} ${styles.narrow}`}><header><p className={styles.eyebrow}>About the platform</p><h1 className={styles.title}>A clear route from choosing a course to practising it.</h1><p className={styles.intro}>KRIN EdTech publishes English courses by level and focus. Course structure, access, pricing and available preview lessons are shown from the current platform data before a learner pays.</p></header>{heading ? <section className={styles.slot}><h2>{heading}</h2>{body ? <p>{body}</p> : null}</section> : <section className={styles.notice}><h2>More organization information is being prepared.</h2><p>The platform operator has not published this optional page content yet. We do not invent company details, team claims or learner outcomes.</p></section>}<section className={styles.grid3} aria-label="How KRIN EdTech works"><article className={styles.card}><h2>Choose with context</h2><p>Filter the live catalogue by a published level, direction and format. Results remain scoped to their own level.</p></article><article className={styles.card}><h2>Review the programme</h2><p>Public course pages show the current programme, access conditions and genuinely available free lessons.</p></article><article className={styles.card}><h2>Learn from your account</h2><p>After verified access is issued, lessons, exercise attempts and progress are linked to the learner account.</p></article></section><section className={styles.ctaSection}><h2>Need verified organisation or policy details?</h2><p>Read only documents published by the operator. If a policy is not available, contact support before making a payment.</p><div className={styles.actions}><Link href="/contact" className={styles.primary}>Contact details</Link><Link href="/legal/organization" className={styles.secondary}>Organisation information</Link></div></section></div></main>;
}
