import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import type { CancelResult, CheckoutResult, CreateCheckoutInput, CreateRefundInput, PaymentProvider, RefundResult, VerifiedPaymentEvent, VerifyWebhookInput } from "@/modules/payments/types/payment-provider.types";

const LIQPAY_CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout";
const callbackSchema = z.object({ public_key: z.string().min(1), order_id: z.string().min(1).max(255), status: z.string().min(1), amount: z.coerce.number().positive().finite(), currency: z.string().length(3).transform((value) => value.toUpperCase()), payment_id: z.union([z.string(), z.number()]).optional(), completion_date: z.string().optional(), action: z.string().optional() });
export type LiqPayCallback = z.infer<typeof callbackSchema>;

function required(name: "LIQPAY_PUBLIC_KEY" | "LIQPAY_PRIVATE_KEY") { const value = process.env[name]; if (!value) throw new Error("LiqPay is not configured."); return value; }
function formatMinorAmount(amount: number) { return (amount / 100).toFixed(2); }

export function createLiqPaySignature(data: string, privateKey: string) { return createHash("sha3-256").update(`${privateKey}${data}${privateKey}`).digest("base64"); }
export function verifyLiqPaySignature(data: string, signature: string, privateKey: string) { const expected = Buffer.from(createLiqPaySignature(data, privateKey)); const received = Buffer.from(signature); return expected.length === received.length && timingSafeEqual(expected, received); }
export function decodeLiqPayCallback(data: string) { try { return callbackSchema.safeParse(JSON.parse(Buffer.from(data, "base64").toString("utf8"))); } catch { return null; } }
export function mapLiqPayStatus(status: string, mode = process.env.LIQPAY_MODE) { switch (status) { case "success": case "subscribed": return "SUCCEEDED" as const; case "sandbox": return mode === "sandbox" ? "SUCCEEDED" as const : "PROCESSING" as const; case "failure": case "error": return "FAILED" as const; case "reversed": return "REFUNDED" as const; case "unsubscribed": return "CANCELED" as const; case "expired": return "EXPIRED" as const; default: return "PROCESSING" as const; } }
export function createLiqPayCallbackEventId(callback: LiqPayCallback) { return createHash("sha256").update([callback.order_id, callback.payment_id ?? "", callback.status, callback.completion_date ?? ""].join(":")) .digest("hex"); }

export class LiqPayPaymentProvider implements PaymentProvider {
  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    if (input.price.currency !== "UAH") throw new Error("LiqPay supports UAH prices only.");
    const publicKey = required("LIQPAY_PUBLIC_KEY");
    const privateKey = required("LIQPAY_PRIVATE_KEY");
    const resultUrl = new URL("/payment/pending", input.origin); resultUrl.searchParams.set("order", input.order.number); resultUrl.searchParams.set("paymentId", input.payment.id);
    const payload = { version: 7, public_key: publicKey, action: "pay", amount: formatMinorAmount(input.price.amount), currency: "UAH", description: input.payment.description, order_id: input.order.number, server_url: new URL("/api/webhooks/liqpay", input.origin).toString(), result_url: resultUrl.toString(), language: "uk", ...(process.env.LIQPAY_MODE === "sandbox" ? { sandbox: 1 } : {}) };
    const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    return { kind: "form", form: { action: process.env.LIQPAY_CHECKOUT_URL || LIQPAY_CHECKOUT_URL, fields: { data, signature: createLiqPaySignature(data, privateKey) } }, providerOrderId: input.order.number, providerMetadata: { mode: process.env.LIQPAY_MODE || "production" }, amount: input.price.amount, currency: "UAH" };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent> {
    const form = new URLSearchParams(input.body);
    const data = form.get("data"); const signature = form.get("signature"); const privateKey = required("LIQPAY_PRIVATE_KEY"); const publicKey = required("LIQPAY_PUBLIC_KEY");
    if (!data || !signature || !verifyLiqPaySignature(data, signature, privateKey)) throw new Error("Invalid LiqPay callback signature.");
    const parsed = decodeLiqPayCallback(data);
    if (!parsed?.success || parsed.data.public_key !== publicKey) throw new Error("Invalid LiqPay callback payload.");
    const callback = parsed.data;
    return { provider: "LIQPAY", eventId: createLiqPayCallbackEventId(callback), eventType: `liqpay.${callback.status}`, orderId: null, providerCheckoutId: callback.order_id, providerPaymentId: callback.payment_id ? String(callback.payment_id) : null, amount: Math.round(callback.amount * 100), currency: callback.currency, status: mapLiqPayStatus(callback.status), occurredAt: callback.completion_date ? new Date(callback.completion_date.replace(" ", "T") + "Z") : new Date(), rawReference: callback.order_id, metadata: { liqpayStatus: callback.status } };
  }

  async createRefund(_input: CreateRefundInput): Promise<RefundResult> { throw new Error("LiqPay refunds must be initiated in the provider dashboard until the merchant refund API is configured."); }
  async cancelSubscription(_input: { providerSubscriptionId: string; atPeriodEnd?: boolean }): Promise<CancelResult> { return { cancelAtPeriodEnd: true }; }
}
