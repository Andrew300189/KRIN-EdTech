"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Payment = {
  id: string;
  provider: "STRIPE" | "LIQPAY";
  plan: string;
  billingPeriod: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED" | "EXPIRED";
  order?: { number: string; status: string; items: Array<{ titleSnapshot: string; quantity: number; totalAmount: number; product: { course: { slug: string } | null } }> } | null;
};

const messages = {
  pending: {
    title: "Payment is being confirmed",
    body: "Your access will be updated only after a verified payment-provider callback.",
  },
  success: {
    title: "Payment confirmed",
    body: "Your Premium access is active.",
  },
  failed: {
    title: "Payment was not completed",
    body: "No access was granted. You can safely try again from billing.",
  },
} as const;

export function PaymentStatusPage({ state }: { state: keyof typeof messages }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId) {
      setError("The payment reference is missing.");
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/billing/payments/${encodeURIComponent(paymentId)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Unable to check payment status.");
        if (!active) return;
        setPayment(payload.payment);
        if (payload.payment.status === "PAID" && state !== "success") {
          router.replace(`/payment/success?paymentId=${encodeURIComponent(paymentId)}`);
        } else if (["FAILED", "CANCELED", "REFUNDED", "EXPIRED"].includes(payload.payment.status) && state !== "failed") {
          router.replace(`/payment/failed?paymentId=${encodeURIComponent(paymentId)}`);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to check payment status.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 2_000);
    const stop = window.setTimeout(() => window.clearInterval(timer), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [paymentId, router, state]);

  const message = messages[state];
  const purchasedCourse = payment?.order?.items.find((item) => item.product.course)?.product.course ?? null;
  return <main className="mx-auto max-w-xl px-6 py-20">
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{message.title}</h1>
      <p className="mt-3 text-slate-600">{message.body}</p>
      {payment ? <dl className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-700">
        <div><dt className="text-slate-500">Provider</dt><dd>{payment.provider}</dd></div>
        <div><dt className="text-slate-500">Status</dt><dd>{payment.status}</dd></div>
        <div><dt className="text-slate-500">Plan</dt><dd>{payment.plan}</dd></div>
        <div><dt className="text-slate-500">Period</dt><dd>{payment.billingPeriod.toLowerCase()}</dd></div>
        {payment.order ? <div><dt className="text-slate-500">Order</dt><dd>{payment.order.number}</dd></div> : null}
      </dl> : null}
      {error ? <p className="mt-5 text-sm text-red-700" role="alert">{error}</p> : null}
      {state === "success" && purchasedCourse ? <Link className="btn btn-primary mt-8 inline-flex" href={`/courses/${purchasedCourse.slug}`}>Open purchased course</Link> : <Link className="btn btn-primary mt-8 inline-flex" href="/dashboard/billing">Back to billing</Link>}
    </section>
  </main>;
}
