import {
  createLiqPayCallbackEventId,
  createLiqPaySignature,
  decodeLiqPayCallback,
  mapLiqPayStatus,
  verifyLiqPaySignature,
  LiqPayPaymentProvider,
} from "@/modules/payments/services/liqpay.service";
import { getPaymentProvider } from "@/modules/payments/services/payment-provider.factory";

const privateKey = "private-test-key";
const callback = {
  public_key: "public-test-key",
  order_id: "krin-payment-1",
  payment_id: 12345,
  status: "success",
  amount: "399.00",
  currency: "UAH",
  completion_date: "2026-07-30 15:00:00",
};

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("LiqPay payment provider", () => {
  it("creates and verifies the checkout/callback signature", () => {
    const data = Buffer.from(JSON.stringify(callback), "utf8").toString("base64");
    const signature = createLiqPaySignature(data, privateKey);

    expect(verifyLiqPaySignature(data, signature, privateKey)).toBe(true);
    expect(verifyLiqPaySignature(data, `${signature}tampered`, privateKey)).toBe(false);
  });

  it("decodes and validates a signed callback payload only after signature verification", () => {
    const data = Buffer.from(JSON.stringify(callback), "utf8").toString("base64");
    const parsed = decodeLiqPayCallback(data);

    expect(parsed?.success).toBe(true);
    if (parsed?.success) {
      expect(parsed.data.currency).toBe("UAH");
      expect(parsed.data.amount).toBe(399);
      expect(createLiqPayCallbackEventId(parsed.data)).toHaveLength(64);
    }
  });

  it("generates checkout data from server-side plan pricing", async () => {
    const previous = {
      publicKey: process.env.LIQPAY_PUBLIC_KEY,
      privateKey: process.env.LIQPAY_PRIVATE_KEY,
      price: process.env.LIQPAY_PRICE_PREMIUM_MONTHLY_UAH,
      mode: process.env.LIQPAY_MODE,
    };
    process.env.LIQPAY_PUBLIC_KEY = "sandbox_public";
    process.env.LIQPAY_PRIVATE_KEY = privateKey;
    process.env.LIQPAY_PRICE_PREMIUM_MONTHLY_UAH = "399.00";
    process.env.LIQPAY_MODE = "sandbox";

    try {
      const checkout = await new LiqPayPaymentProvider().createCheckoutSession({
        order: { id: "order-1", number: "KRIN-TEST-1", type: "SUBSCRIPTION" },
        payment: { id: "payment-1", description: "Premium access" },
        user: { id: "user-1", email: "student@example.com", name: "Student", stripeCustomerId: null },
        product: { id: "product-1", title: "Premium", description: "Premium access", type: "SUBSCRIPTION_PLAN", trialDays: 0 },
        price: { id: "price-1", amount: 39_900, currency: "UAH", billingPeriod: "MONTH", providerPriceId: null },
        origin: "https://example.com",
      });
      const encodedData = checkout.form?.fields.data;
      const payload = encodedData ? JSON.parse(Buffer.from(encodedData, "base64").toString("utf8")) : null;

      expect(checkout.kind).toBe("form");
      expect(checkout.amount).toBe(39_900);
      expect(checkout.currency).toBe("UAH");
      expect(payload).toMatchObject({ version: 7, amount: "399.00", currency: "UAH", sandbox: 1, order_id: "KRIN-TEST-1" });
      expect(payload.server_url).toBe("https://example.com/api/webhooks/liqpay");
    } finally {
      restoreEnvironment("LIQPAY_PUBLIC_KEY", previous.publicKey);
      restoreEnvironment("LIQPAY_PRIVATE_KEY", previous.privateKey);
      restoreEnvironment("LIQPAY_PRICE_PREMIUM_MONTHLY_UAH", previous.price);
      restoreEnvironment("LIQPAY_MODE", previous.mode);
    }
  });

  it("maps provider statuses to central internal statuses", () => {
    expect(mapLiqPayStatus("success")).toBe("SUCCEEDED");
    expect(mapLiqPayStatus("sandbox", "sandbox")).toBe("SUCCEEDED");
    expect(mapLiqPayStatus("sandbox", "production")).toBe("PROCESSING");
    expect(mapLiqPayStatus("failure")).toBe("FAILED");
    expect(mapLiqPayStatus("reversed")).toBe("REFUNDED");
    expect(mapLiqPayStatus("wait_secure")).toBe("PROCESSING");
  });

  it("selects the correct provider adapter through the factory", () => {
    expect(getPaymentProvider("STRIPE").createCheckoutSession).toBeInstanceOf(Function);
    expect(getPaymentProvider("LIQPAY").createCheckoutSession).toBeInstanceOf(Function);
  });
});
