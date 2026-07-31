"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Provider = "STRIPE" | "LIQPAY";
type Price = { id: string; provider: Provider; currency: string; amount: number; billingPeriod: string };
type Product = { id: string; title: string; description: string | null; type: "SUBSCRIPTION_PLAN" | "COURSE" | "COURSE_BUNDLE" | "MODULE" | "LESSON_PACK"; plan: { code: string; title: string; trialDays: number } | null; prices: Price[] };
type SubscriptionState = { plan: string; status: string; currentPeriodEnd: string | null; hasPremiumAccess: boolean; hasBillingPortal: boolean; provider: Provider | null; subscriptionId: string | null; cancelAtPeriodEnd: boolean };
type PaymentRecord = { id: string; provider: Provider; amount: number; currency: string; status: string; createdAt: string; order?: { number: string; items: { titleSnapshot: string }[] } | null };
type CheckoutResponse = { kind: "redirect" | "form"; url?: string; form?: { action: string; fields: Record<string, string> }; error?: string };

const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100);
function submitHostedForm(form: NonNullable<CheckoutResponse["form"]>) { const element = document.createElement("form"); element.method = "POST"; element.action = form.action; for (const [name, value] of Object.entries(form.fields)) { const field = document.createElement("input"); field.type = "hidden"; field.name = name; field.value = value; element.append(field); } document.body.append(element); element.submit(); }

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [provider, setProvider] = useState<Provider>("STRIPE");
  const [promotionCode, setPromotionCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadBilling = useCallback(async () => {
    setError("");
    try {
      const [subscriptionResponse, historyResponse, productsResponse] = await Promise.all([fetch("/api/billing/subscription", { cache: "no-store" }), fetch("/api/billing/payments", { cache: "no-store" }), fetch(`/api/billing/products?provider=${provider}`, { cache: "no-store" })]);
      const [subscriptionPayload, historyPayload, productPayload] = await Promise.all([subscriptionResponse.json(), historyResponse.json(), productsResponse.json()]);
      if (!subscriptionResponse.ok || !historyResponse.ok || !productsResponse.ok) throw new Error(subscriptionPayload.error || historyPayload.error || productPayload.error || "Unable to load billing.");
      setSubscription(subscriptionPayload); setPayments(historyPayload.payments); setProducts(productPayload.products);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load billing."); } finally { setLoading(false); }
  }, [provider]);
  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const available = useMemo(() => products.map((product) => ({ product, price: product.prices.find((price) => price.provider === provider) ?? null })).filter((entry) => entry.price), [products, provider]);
  async function startCheckout(price: Price) {
    setWorking(price.id); setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ productPriceId: price.id, provider, ...(promotionCode.trim() ? { promotionCode: promotionCode.trim() } : {}) }) });
      const payload = await response.json() as CheckoutResponse;
      if (!response.ok) throw new Error(payload.error || "Unable to start checkout.");
      if (payload.kind === "redirect" && payload.url) { window.location.assign(payload.url); return; }
      if (payload.kind === "form" && payload.form) { submitHostedForm(payload.form); return; }
      throw new Error("Payment provider returned an invalid checkout response.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start checkout."); setWorking(null); }
  }

  async function requestCancellation() {
    if (!subscription?.subscriptionId || subscription.cancelAtPeriodEnd) return;
    if (!window.confirm("Cancel renewal at the end of the current billing period? Your access will remain active until then.")) return;
    setWorking("cancel-subscription");
    setError("");
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.subscriptionId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to cancel renewal.");
      await loadBilling();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel renewal.");
    } finally {
      setWorking(null);
    }
  }

  return <div className="max-w-6xl space-y-6">
    <header><h2 className="text-3xl font-bold text-slate-900">Plans and purchases</h2><p className="mt-2 text-slate-600">Prices are loaded from the secure product catalog. Access is granted only after a verified provider webhook.</p></header>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Payment method</h3><div className="mt-4 flex flex-wrap gap-3"><button className={`btn ${provider === "STRIPE" ? "btn-primary" : "btn-secondary"}`} type="button" onClick={() => setProvider("STRIPE")}>Card / international — Stripe</button><button className={`btn ${provider === "LIQPAY" ? "btn-primary" : "btn-secondary"}`} type="button" onClick={() => setProvider("LIQPAY")}>Ukraine — LiqPay</button></div><label className="mt-4 block max-w-sm text-sm font-medium text-slate-700">Promotion code<input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} maxLength={64} className="mt-2 w-full rounded-md border border-slate-300 p-2" placeholder="Optional" /></label></section>
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Products">{available.map(({ product, price }) => <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{product.type.replace(/_/g, " ")}</p><h3 className="mt-2 text-xl font-bold text-slate-900">{product.title}</h3><p className="mt-2 min-h-10 text-sm text-slate-600">{product.description}</p><p className="mt-5 text-2xl font-bold text-slate-900">{money(price!.amount, price!.currency)}</p><p className="mt-1 text-sm text-slate-500">{price!.billingPeriod === "NONE" ? "One-time purchase" : price!.billingPeriod.toLowerCase().replace(/_/g, " ")}</p>{product.plan?.trialDays ? <p className="mt-2 text-sm text-emerald-700">{product.plan.trialDays}-day trial</p> : null}<button className="btn btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={loading || Boolean(working)} onClick={() => void startCheckout(price!)}>{working === price!.id ? "Opening secure checkout…" : "Continue to secure payment"}</button></article>)}</section>
    {!loading && available.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">No active prices are configured for this provider yet.</p> : null}
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Current access</h3><p className="mt-2 text-sm text-slate-600">{subscription?.hasPremiumAccess ? `${subscription.plan} access is active.` : "You currently have Free access."}</p>{subscription?.currentPeriodEnd ? <p className="mt-1 text-sm text-slate-600">Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</p> : null}{subscription?.subscriptionId && subscription.provider === "STRIPE" ? <div className="mt-4">{subscription.cancelAtPeriodEnd ? <p className="text-sm font-medium text-amber-700">Renewal is cancelled. Access remains available until the end of the current period.</p> : <button type="button" className="btn btn-secondary" disabled={working === "cancel-subscription"} onClick={() => void requestCancellation()}>{working === "cancel-subscription" ? "Cancelling renewal…" : "Cancel renewal"}</button>}</div> : null}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Payment history</h3>{payments.length ? <ul className="mt-3 divide-y divide-slate-100">{payments.map((payment) => <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-medium">{payment.order?.items[0]?.titleSnapshot ?? "Platform payment"} · {payment.provider}</span><span>{money(payment.amount, payment.currency)} · {payment.status}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No payments yet.</p>}</section>
  </div>;
}
