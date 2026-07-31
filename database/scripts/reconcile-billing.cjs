/* Read-only billing reconciliation. It reports inconsistencies; it never grants or revokes access. */
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");
const prisma = new PrismaClient();

async function main() {
  const [paidWithoutEntitlement, activeEntitlementsWithoutPaidOrder, paidPaymentWithPendingOrder, duplicateProviderPayments] = await Promise.all([
    prisma.order.findMany({ where: { status: "PAID", entitlements: { none: {} } }, select: { id: true, number: true, userId: true, totalAmount: true, currency: true } }),
    prisma.entitlement.findMany({ where: { status: "ACTIVE", order: { is: { status: { not: "PAID" } } } }, select: { id: true, orderId: true, userId: true } }),
    prisma.payment.findMany({ where: { status: "PAID", order: { is: { status: "PENDING" } } }, select: { id: true, orderId: true, provider: true } }),
    prisma.payment.groupBy({ by: ["provider", "providerPaymentId"], where: { providerPaymentId: { not: null } }, _count: { _all: true }, having: { providerPaymentId: { _count: { gt: 1 } } } }),
  ]);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), paidWithoutEntitlement, activeEntitlementsWithoutPaidOrder, paidPaymentWithPendingOrder, duplicateProviderPayments }, null, 2));
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
