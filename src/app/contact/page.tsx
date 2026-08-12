import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import styles from "../public-info.module.css";

export const metadata: Metadata = { title: "Contact KRIN EdTech", description: "Published contact and support information for KRIN EdTech.", alternates: { canonical: "/contact" } };
function field(content: unknown, key: string) { if (!content || typeof content !== "object" || Array.isArray(content)) return null; const value = (content as Record<string, unknown>)[key]; return typeof value === "string" && value.trim() ? value.trim() : null; }

export default async function ContactPage() { const slot = await getPublishedCmsContentSlot("legal.organization"); const heading = field(slot?.content, "heading") ?? slot?.title ?? "Contact and support"; const body = field(slot?.content, "body"); const email = field(slot?.content, "contactEmail"); return <main className={styles.page}><PublicSiteHeader /><div className={`${styles.container} ${styles.narrow}`}><p className={styles.eyebrow}>Contact</p><h1 className={styles.title}>{heading}</h1>{body ? <div className={styles.body}>{body.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}</div> : <section className={styles.warning}><h2>Contact information is not published yet.</h2><p>The platform operator has not provided a verified public contact. We do not display invented emails, addresses or response-time promises.</p></section>}{email ? <div className={styles.actions}><a href={`mailto:${email}`} className={styles.primary}>Email support</a></div> : <div className={styles.actions}><Link href="/help" className={styles.primary}>Open help centre</Link><Link href="/legal/organization" className={styles.secondary}>Published organisation details</Link></div>}</div></main>; }
