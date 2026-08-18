"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, RefreshCw, ShoppingBag, Users } from "lucide-react";
import type { CmsSalesAnalytics, CmsSalesPeriod } from "@/modules/cms/services/cms-sales-analytics.service";
import styles from "./CmsSalesAnalyticsWorkspace.module.css";

type Props = { report: CmsSalesAnalytics };

const periodOptions: Array<{ value: CmsSalesPeriod; label: string }> = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "WEEK", label: "This week" },
  { value: "MONTH", label: "This month" },
  { value: "YEAR", label: "This year" },
  { value: "CUSTOM", label: "Custom range" },
];

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function moneyList(rows: Array<{ currency: string; amount: number }>): string {
  return rows.length ? rows.map((row) => formatMoney(row.amount, row.currency)).join(" · ") : "—";
}

function changeLabel(current: number, previous: number, label: string): string {
  if (previous === 0) return current === 0 ? `No ${label} in the previous period` : `New ${label} in this period`;
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "▲" : "▼"} ${Math.abs(percent)}% vs previous period`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function safeExportUrl(search: URLSearchParams): string {
  return `/api/admin/cms/sales/export?${search.toString()}`;
}

export function CmsSalesAnalyticsWorkspace({ report }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"products" | "buyers" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const refreshTimer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [router]);

  const updateFilters = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const displayedTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return report.transactions;
    return report.transactions.filter((transaction) => [
      transaction.orderNumber,
      transaction.student.name,
      transaction.student.email,
      ...transaction.items.map((item) => item.title),
    ].some((value) => value.toLowerCase().includes(query)));
  }, [report.transactions, search]);

  const chartRows = report.productRanking.slice(0, 6).map((product) => ({
    name: product.title.length > 20 ? `${product.title.slice(0, 20)}…` : product.title,
    sold: product.sold,
  }));
  const exportParams = new URLSearchParams(searchParams.toString());

  return (
    <div className={styles.workspace} aria-busy={isPending}>
      <section className={styles.toolbar} aria-label="Sales report filters">
        <div className={styles.periods}>
          {periodOptions.map((option) => (
            <button key={option.value} type="button" className={report.filters.period === option.value ? styles.periodActive : styles.period} onClick={() => updateFilters({ period: option.value })}>
              {option.label}
            </button>
          ))}
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.iconButton} onClick={() => router.refresh()} aria-label="Refresh sales report" title="Refresh sales report"><RefreshCw size={16} aria-hidden="true" /></button>
          <a className={styles.exportButton} href={safeExportUrl(exportParams)}><Download size={16} aria-hidden="true" /> Download CSV</a>
        </div>
      </section>

      {report.filters.period === "CUSTOM" ? <section className={styles.customRange} aria-label="Custom date range">
        <label>From<input type="date" value={report.filters.from ?? ""} onChange={(event) => updateFilters({ from: event.target.value || undefined })} /></label>
        <label>To<input type="date" value={report.filters.to ?? ""} onChange={(event) => updateFilters({ to: event.target.value || undefined })} /></label>
      </section> : null}

      <section className={styles.metrics} aria-label="Sales summary">
        <button type="button" className={styles.metricCard} onClick={() => setDialog("products")}>
          <span className={styles.metricIcon}><ShoppingBag size={18} aria-hidden="true" /></span>
          <span className={styles.metricLabel}>Courses and access items sold</span>
          <strong>{report.metrics.itemsSold.toLocaleString("en-US")}</strong>
          <span className={styles.metricDetail}>{changeLabel(report.metrics.itemsSold, report.metrics.previousItemsSold, "sales")}</span>
          <span className={styles.metricAction}>Open purchase ranking →</span>
        </button>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>₴</span>
          <span className={styles.metricLabel}>Confirmed revenue</span>
          <strong className={styles.revenueValue}>{moneyList(report.metrics.revenueByCurrency)}</strong>
          <span className={styles.metricDetail}>{report.metrics.revenueByCurrency.length > 1 ? "Currencies remain separate" : changeLabel(report.metrics.revenueByCurrency[0]?.amount ?? 0, report.metrics.previousRevenueByCurrency[0]?.amount ?? 0, "revenue")}</span>
        </article>
        <button type="button" className={styles.metricCard} onClick={() => setDialog("buyers")}>
          <span className={styles.metricIcon}><Users size={18} aria-hidden="true" /></span>
          <span className={styles.metricLabel}>Unique paying students</span>
          <strong>{report.metrics.uniqueStudents.toLocaleString("en-US")}</strong>
          <span className={styles.metricDetail}>{changeLabel(report.metrics.uniqueStudents, report.metrics.previousUniqueStudents, "buyers")}</span>
          <span className={styles.metricAction}>Open buyer ranking →</span>
        </button>
      </section>

      <section className={styles.insights}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><p className={styles.kicker}>Sales distribution</p><h2>Top products by purchases</h2></div><span>{report.productRanking.length} products sold</span></div>
          {chartRows.length ? <div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 14, top: 2, bottom: 2 }}><CartesianGrid horizontal={false} stroke="var(--border)" /><XAxis type="number" allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} /><YAxis type="category" dataKey="name" width={135} stroke="var(--text-secondary)" fontSize={12} /><Tooltip cursor={{ fill: "color-mix(in srgb, var(--primary) 8%, transparent)" }} contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--surface-elevated)" }} /><Bar dataKey="sold" fill="var(--primary)" radius={[6, 6, 6, 6]} /></BarChart></ResponsiveContainer></div> : <p className={styles.empty}>No confirmed sales in this period yet.</p>}
        </article>
        <aside className={styles.panel}>
          <div className={styles.panelHeading}><div><p className={styles.kicker}>Live activity</p><h2>Confirmed purchases</h2></div><span>Auto-refreshes every 30s</span></div>
          {report.activity.length ? <ol className={styles.activityList}>{report.activity.map((entry) => <li key={entry.id}><span className={styles.activityDot} aria-hidden="true" /><div><strong>{entry.studentName}</strong><p>bought {entry.productTitle}</p><time dateTime={entry.occurredAt}>{formatDate(entry.occurredAt)} · {entry.provider}{entry.paymentMethod ? ` · ${entry.paymentMethod}` : ""}</time></div><b>{formatMoney(entry.amount, entry.currency)}</b></li>)}</ol> : <p className={styles.empty}>A verified purchase will appear here as soon as it is recorded.</p>}
        </aside>
      </section>

      <section className={styles.panel}>
        <div className={styles.tableHeading}><div><p className={styles.kicker}>Transactions</p><h2>Confirmed orders</h2><p>Only provider-confirmed orders are listed; failed and pending attempts are excluded from revenue.</p></div><label className={styles.searchLabel}>Search purchases<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student, email, order or course" /></label></div>
        <div className={styles.tableFilters}>
          <label>Product<select value={report.filters.productId ?? ""} onChange={(event) => updateFilters({ productId: event.target.value || undefined })}><option value="">All products</option>{report.products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
          <span>{displayedTransactions.length} of {report.transactions.length} transactions shown</span>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Order / paid at</th><th>Student</th><th>Purchased item</th><th>Purchase type</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{displayedTransactions.map((transaction) => <tr key={transaction.id}><td><strong>#{transaction.orderNumber}</strong><time dateTime={transaction.occurredAt}>{formatDate(transaction.occurredAt)}</time></td><td><strong>{transaction.student.name}</strong><span>{transaction.student.email}</span></td><td><div className={styles.itemTags}>{transaction.items.map((item) => <span key={item.id} className={styles.itemTag}>{item.title}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>)}</div></td><td>{transaction.purchaseType}</td><td><strong>{formatMoney(transaction.amount, transaction.currency)}</strong><span>{transaction.provider}</span></td><td><span className={styles.paidStatus}>Paid</span></td></tr>)}</tbody>
          </table>
          {!displayedTransactions.length ? <p className={styles.tableEmpty}>No confirmed orders match these filters.</p> : null}
        </div>
      </section>

      {dialog ? <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setDialog(null)}><section role="dialog" aria-modal="true" aria-labelledby="sales-dialog-title" className={styles.dialog} onMouseDown={(event) => event.stopPropagation()}><div className={styles.dialogHeading}><div><p className={styles.kicker}>Ranking</p><h2 id="sales-dialog-title">{dialog === "products" ? "Purchased courses and access items" : "Top paying students"}</h2></div><button type="button" onClick={() => setDialog(null)} aria-label="Close dialog">x</button></div>{dialog === "products" ? <ol className={styles.ranking}>{report.productRanking.map((product, index) => <li key={product.productId}><b>{index + 1}</b><div><strong>{product.title}</strong><span>{product.type.split("_").join(" ")}</span></div><p><strong>{product.sold} purchases</strong><span>{moneyList(product.revenueByCurrency)}</span></p></li>)}{!report.productRanking.length ? <p className={styles.empty}>No paid items for this period.</p> : null}</ol> : <ol className={styles.ranking}>{report.buyerRanking.map((buyer, index) => <li key={buyer.id}><b>{index + 1}</b><div><strong>{buyer.name}</strong><span>{buyer.email}</span></div><p><em>{buyer.purchaseStatus}</em><strong>{buyer.itemsBought} items · {buyer.orders} orders</strong></p></li>)}{!report.buyerRanking.length ? <p className={styles.empty}>No paying students for this period.</p> : null}</ol>}</section></div> : null}
    </div>
  );
}
