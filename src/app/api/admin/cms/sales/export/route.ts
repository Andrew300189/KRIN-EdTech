import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { getCmsSalesAnalytics, parseCmsSalesFilters } from "@/modules/cms/services/cms-sales-analytics.service";

function csvCell(value: string | number | null): string {
  const stringValue = value === null ? "" : String(value);
  const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
  return `"${safeValue.split('"').join('""')}"`;
}

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const report = await getCmsSalesAnalytics(parseCmsSalesFilters({
    period: request.nextUrl.searchParams.get("period") ?? undefined,
    productId: request.nextUrl.searchParams.get("productId") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  }));
  const header = ["Order number", "Paid at", "Student", "Email", "Purchased items", "Purchase type", "Amount", "Currency", "Provider", "Payment method", "Status"];
  const rows = report.transactions.map((transaction) => [
    transaction.orderNumber,
    transaction.occurredAt,
    transaction.student.name,
    transaction.student.email,
    transaction.items.map((item) => `${item.title}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join("; "),
    transaction.purchaseType,
    (transaction.amount / 100).toFixed(2),
    transaction.currency,
    transaction.provider,
    transaction.paymentMethod,
    transaction.status,
  ].map(csvCell).join(","));
  const filename = `krin-sales-${report.filters.period.toLowerCase()}.csv`;
  return new NextResponse([header.map(csvCell).join(","), ...rows].join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
