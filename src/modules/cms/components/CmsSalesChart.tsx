"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartRow = { name: string; sold: number };

/** Loaded only when the owner opens sales analytics, keeping Recharts out of
 * every other CMS route and the first analytics response. */
export function CmsSalesChart({ rows }: { rows: ChartRow[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ left: 8, right: 14, top: 2, bottom: 2 }}><CartesianGrid horizontal={false} stroke="var(--border)" /><XAxis type="number" allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} /><YAxis type="category" dataKey="name" width={135} stroke="var(--text-secondary)" fontSize={12} /><Tooltip cursor={{ fill: "color-mix(in srgb, var(--primary) 8%, transparent)" }} contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--surface-elevated)" }} /><Bar dataKey="sold" fill="var(--primary)" radius={[6, 6, 6, 6]} /></BarChart></ResponsiveContainer>;
}
