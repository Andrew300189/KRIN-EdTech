import Link from "next/link";
import type { Metadata } from "next";
import styles from "../pricing-experience.module.css";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";
import { FunnelEventReporter } from "@/modules/analytics/components/FunnelEventReporter";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";

export const metadata: Metadata = {
  title: "Plans and course access",
  description: "Review active course and subscription prices, currencies, billing periods and payment methods before checkout.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Plans and course access", description: "Review active prices, currencies and billing periods before checkout.", url: "/pricing" },
};

function money(amount: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100); }
function periodLabel(period: string) { return period === "NONE" ? "One-time payment" : period === "MONTH" ? "Monthly subscription" : period === "QUARTER" ? "Every 3 months" : period === "SEMI_ANNUAL" ? "Every 6 months" : "Yearly subscription"; }
function providerLabel(provider: string) { return provider === "STRIPE" ? "Card / international · Stripe" : "Ukraine · LiqPay"; }
function productTypeLabel(type: string) { return type.replace(/_/g, " ").toLowerCase(); }

export default async function PricingDetailPage() {
  const [authenticated, products] = await Promise.all([
    requireAuth(),
    prisma.product.findMany({
      where: { isActive: true, isPublic: true, type: { in: ["SUBSCRIPTION_PLAN", "COURSE", "COURSE_BUNDLE"] } },
      include: { plan: { select: { title: true, description: true, trialDays: true } }, prices: { where: { isActive: true }, orderBy: [{ provider: "asc" }, { amount: "asc" }] } },
      orderBy: { title: "asc" },
    }),
  ]);
  const purchaseHref = (priceId: string) => authenticated ? `/dashboard/billing?price=${encodeURIComponent(priceId)}` : `/login?next=${encodeURIComponent(`/dashboard/billing?price=${encodeURIComponent(priceId)}`)}`;

  return <main className={styles.page}><PublicSiteHeader /><FunnelEventReporter eventType="PRICING_VIEW" /><div className={styles.shell}>
    <header className={styles.header}><p className={styles.eyebrow}>Plans and course access</p><h1>See the exact configured price before you start checkout.</h1><p>Each amount below comes from the active server-side product catalogue. Prices are displayed in their stored currency, including UAH when a UAH price is configured; no client-side conversion is used.</p><p className={styles.notice}>Payment succeeds only after Stripe or LiqPay sends a verified server callback. Until then no subscription or course access is granted.</p></header>
    {products.length ? <section className={styles.grid} aria-label="Public prices">{products.map((product) => <article key={product.id} className={styles.card}><p className={styles.type}>{productTypeLabel(product.type)}</p><h2>{product.title}</h2><p className={styles.description}>{product.description || product.plan?.description || "Details are managed in the product catalogue."}</p><div className={styles.prices}>{product.prices.map((price) => <Link key={price.id} href={purchaseHref(price.id)} className={styles.priceOption}><span className={styles.priceTop}><strong>{money(price.amount, price.currency)}</strong><span>{price.currency}</span></span><small>{periodLabel(price.billingPeriod)} · {providerLabel(price.provider)}</small></Link>)}</div>{!product.prices.length ? <p className={styles.empty}>No active price is configured for this product.</p> : null}<ul className={styles.facts}><li>{product.prices.some((price) => price.billingPeriod === "NONE") ? "One-time products have no automatic renewal." : "Subscription period is stated beside every price."}</li><li>{product.prices.some((price) => price.billingPeriod !== "NONE") ? "Active subscription renewal can be managed from Billing after purchase." : "Access is granted after confirmed payment."}</li><li>No separate tax or provider-fee amount is configured in this catalogue.</li></ul>{product.plan?.trialDays ? <p className={styles.trial}>{product.plan.trialDays}-day trial is configured for this plan.</p> : null}{product.prices[0] ? <Link className={styles.cta} href={purchaseHref(product.prices[0].id)}>{authenticated ? "Continue to secure payment" : "Sign in to continue"}</Link> : null}</article>)}</section> : <p className={styles.empty}>There are no public products with active prices yet. Publish a product and price from CMS before accepting a payment.</p>}
    <section className={styles.section}><h2>Before you pay</h2><div className={styles.factsGrid}><article><h3>What you pay</h3><p>The selected amount, currency and billing period are shown before the payment provider opens. The server validates the stored amount again when creating the order.</p></article><article><h3>Renewal and cancellation</h3><p>One-time prices do not renew. Subscription renewal conditions are displayed with the selected period, and eligible active subscriptions can be cancelled from Billing.</p></article><article><h3>Refunds and support</h3><p>Read the published <Link href="/payment-policy" className="font-semibold text-blue-700 hover:underline">payment rules</Link> and <Link href="/refunds" className="font-semibold text-blue-700 hover:underline">refund policy</Link>. If they are not published yet, ask support for clarification before purchase; no guarantee is implied.</p></article></div></section>
    <section className={styles.footerCta}><div><h2>Already chose a course?</h2><p>Open its page to see the published programme, available trial lesson and direct access options.</p></div><Link className={styles.secondary} href="/courses">Browse courses</Link></section>
  </div></main>;
}
