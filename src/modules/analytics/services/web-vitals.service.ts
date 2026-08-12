import { prisma } from "@/core/server/prisma";

export type WebVitalSummary = {
  totalSamples: number;
  byMetric: Array<{ name: string; samples: number; average: number; good: number; needsImprovement: number; poor: number }>;
};

export async function getWebVitalSummary(days = 30): Promise<WebVitalSummary> {
  const since = new Date(Date.now() - Math.max(1, Math.min(days, 90)) * 24 * 60 * 60_000);
  const rows = await prisma.webVitalMetric.groupBy({
    by: ["name", "rating"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _avg: { value: true },
  });
  const byName = new Map<string, { name: string; samples: number; weightedValue: number; good: number; needsImprovement: number; poor: number }>();
  for (const row of rows) {
    const current = byName.get(row.name) ?? { name: row.name, samples: 0, weightedValue: 0, good: 0, needsImprovement: 0, poor: 0 };
    const samples = row._count._all;
    current.samples += samples;
    current.weightedValue += (row._avg.value ?? 0) * samples;
    if (row.rating === "good") current.good += samples;
    if (row.rating === "needs-improvement") current.needsImprovement += samples;
    if (row.rating === "poor") current.poor += samples;
    byName.set(row.name, current);
  }
  const byMetric = [...byName.values()].sort((left, right) => left.name.localeCompare(right.name)).map((row) => ({ ...row, average: Math.round((row.weightedValue / Math.max(1, row.samples)) * 100) / 100 })).map(({ weightedValue: _weightedValue, ...row }) => row);
  return { totalSamples: byMetric.reduce((sum, row) => sum + row.samples, 0), byMetric };
}
