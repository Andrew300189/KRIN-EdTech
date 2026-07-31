-- PostgreSQL makes newly-added enum values safe to use only after the prior
-- transaction commits, so the NONE defaults are deliberately applied here.
ALTER TABLE "Plan" ALTER COLUMN "billingPeriod" SET DEFAULT 'NONE';
ALTER TABLE "ProductPrice" ALTER COLUMN "billingPeriod" SET DEFAULT 'NONE';
