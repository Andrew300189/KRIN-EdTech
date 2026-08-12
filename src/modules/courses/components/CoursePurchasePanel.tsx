"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/courses/course-view.module.css";
import { reportFunnelEvent } from "@/modules/analytics/components/FunnelEventReporter";

type Provider = "STRIPE" | "LIQPAY";
type BillingPeriod = "NONE" | "MONTH" | "QUARTER" | "SEMI_ANNUAL" | "YEAR";
type Price = { id: string; provider: Provider; currency: string; amount: number; billingPeriod: BillingPeriod };
type Product = { id: string; title: string; description: string | null; plan: { title: string; description: string; trialDays: number } | null; prices: Price[] };
type CheckoutResponse = { kind: "redirect" | "form"; url?: string; form?: { action: string; fields: Record<string, string> }; error?: string };

function money(amount: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100); }
function periodLabel(period: BillingPeriod) { return period === "NONE" ? "One-time payment" : period === "MONTH" ? "Renews monthly" : period === "QUARTER" ? "Renews every 3 months" : period === "SEMI_ANNUAL" ? "Renews every 6 months" : "Renews yearly"; }
function providerLabel(provider: Provider) { return provider === "STRIPE" ? "Card / international · Stripe" : "Ukraine · LiqPay"; }
function submitHostedForm(form: NonNullable<CheckoutResponse["form"]>) { const element = document.createElement("form"); element.method = "POST"; element.action = form.action; for (const [name, value] of Object.entries(form.fields)) { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; element.append(input); } document.body.append(element); element.submit(); }

export function CoursePurchasePanel({
  courseId, courseSlug, accessPlan, products, signedIn, hasFullAccess, continueHref, initialPriceId,
}: { courseId: string; courseSlug: string; accessPlan: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE"; products: Product[]; signedIn: boolean; hasFullAccess: boolean; continueHref: string | null; initialPriceId?: string }) {
  const priceOptions = useMemo(() => products.flatMap((product) => product.prices.map((price) => ({ product, price }))), [products]);
  const [selectedPriceId, setSelectedPriceId] = useState(() => priceOptions.some((entry) => entry.price.id === initialPriceId) ? initialPriceId! : priceOptions[0]?.price.id ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const selected = priceOptions.find((entry) => entry.price.id === selectedPriceId) ?? priceOptions[0] ?? null;
  const returnPath = `/courses/${encodeURIComponent(courseSlug)}${selected?.price.id ? `?price=${encodeURIComponent(selected.price.id)}` : ""}`;
  const signInHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;

  async function startCheckout() {
    if (!selected || working) return;
    setWorking(true);
    setError("");
    reportFunnelEvent("CHECKOUT_START", { courseId, planCode: accessPlan, currency: selected.price.currency, result: "STARTED" });
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ productPriceId: selected.price.id, provider: selected.price.provider }) });
      const payload = await response.json().catch(() => null) as CheckoutResponse | null;
      if (!response.ok || !payload) throw new Error(payload?.error || "Unable to start secure checkout.");
      if (payload.kind === "redirect" && payload.url) { window.location.assign(payload.url); return; }
      if (payload.kind === "form" && payload.form) { submitHostedForm(payload.form); return; }
      throw new Error("The payment provider returned an invalid checkout response.");
    } catch (cause) {
      reportFunnelEvent("CHECKOUT_ERROR", { courseId, planCode: accessPlan, currency: selected.price.currency, result: "FAILED" });
      setError(cause instanceof Error ? cause.message : "Unable to start secure checkout.");
      setWorking(false);
    }
  }

  if (hasFullAccess && continueHref) return <aside className={`${styles.purchasePanel} ${styles.hasAccess}`} aria-label="Course access"><p className={styles.purchaseEyebrow}>Your access</p><h2>Ready to continue</h2><p>You already have access to this course. Your lesson progress remains in your account.</p><Link className={styles.purchasePrimary} href={continueHref}>Continue learning</Link></aside>;

  if (!selected) return <aside className={styles.purchasePanel} aria-label="Course access options"><p className={styles.purchaseEyebrow}>Access options</p><h2>Review available plans</h2><p>No direct checkout option is configured for this course yet. Current public plans and prices are listed separately.</p><Link className={styles.purchasePrimary} href="/pricing">View pricing</Link></aside>;

  return <aside className={styles.purchasePanel} aria-label="Purchase this course"><p className={styles.purchaseEyebrow}>Secure checkout</p><h2>{money(selected.price.amount, selected.price.currency)}</h2><p className={styles.purchasePeriod}>{periodLabel(selected.price.billingPeriod)}</p>
    {priceOptions.length > 1 ? <label className={styles.purchaseSelectLabel}>Choose a configured payment option<select value={selected.price.id} onChange={(event) => setSelectedPriceId(event.target.value)} className={styles.purchaseSelect}>{priceOptions.map((entry) => <option key={entry.price.id} value={entry.price.id}>{entry.product.title} · {money(entry.price.amount, entry.price.currency)} · {providerLabel(entry.price.provider)}</option>)}</select></label> : <p className={styles.purchaseProvider}>{providerLabel(selected.price.provider)}</p>}
    <ul className={styles.purchaseFacts}><li>Final amount: {money(selected.price.amount, selected.price.currency)}</li><li>{selected.price.billingPeriod === "NONE" ? "No automatic renewal." : "Renewal can be cancelled from Billing after purchase."}</li><li>Separate tax and provider-fee lines are not configured in this product catalogue.</li><li>Access is issued only after the provider webhook confirms payment.</li></ul>
    {selected.product.plan?.trialDays ? <p className={styles.purchaseTrial}>{selected.product.plan.trialDays}-day trial is configured for this plan.</p> : null}
    {signedIn ? <button type="button" className={styles.purchasePrimary} disabled={working} onClick={() => void startCheckout()}>{working ? "Opening secure checkout…" : "Continue to secure payment"}</button> : <div className={styles.purchaseActions}><Link className={styles.purchasePrimary} href={signInHref}>Sign in to purchase</Link><Link className={styles.purchaseSecondary} href={registerHref}>Create account</Link></div>}
    <p className={styles.purchaseNote}>Read the <Link href="/payment-policy" className="underline">payment rules</Link> and <Link href="/refunds" className="underline">refund policy</Link> before purchase. If a policy has not been published yet, contact support for clarification.</p>
    {error ? <p className={styles.purchaseError} role="alert">{error}</p> : null}
  </aside>;
}
