-- General payment storage shared by Stripe and LiqPay.
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'LIQPAY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED', 'EXPIRED');
CREATE TYPE "BillingPeriod" AS ENUM ('MONTH', 'YEAR');

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPaymentId" TEXT,
    "providerOrderId" TEXT,
    "providerStatus" TEXT,
    "providerMetadata" JSONB,
    "plan" "SubscriptionPlan" NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "PaymentStatus",
    "payloadHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Subscription"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "providerPriceId" TEXT,
  ADD COLUMN "sourcePaymentId" TEXT;

UPDATE "Subscription"
SET
  "providerSubscriptionId" = "stripeSubscriptionId",
  "providerPriceId" = "stripePriceId";

INSERT INTO "PaymentEvent" ("id", "provider", "providerEventId", "eventType", "createdAt")
SELECT 'migrated-' || "id", 'STRIPE', "stripeEventId", "type", "processedAt"
FROM "StripeWebhookEvent";

ALTER TABLE "Subscription"
  DROP COLUMN "stripeSubscriptionId",
  DROP COLUMN "stripePriceId";

DROP TABLE "StripeWebhookEvent";

CREATE UNIQUE INDEX "Subscription_provider_providerSubscriptionId_key" ON "Subscription"("provider", "providerSubscriptionId");
CREATE INDEX "Subscription_provider_status_idx" ON "Subscription"("provider", "status");
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");
CREATE UNIQUE INDEX "Payment_provider_providerOrderId_key" ON "Payment"("provider", "providerOrderId");
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");
CREATE INDEX "PaymentEvent_provider_status_idx" ON "PaymentEvent"("provider", "status");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_sourcePaymentId_fkey"
  FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
