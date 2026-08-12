/*
  Search analytics retention cleanup script.
  Usage:
    node database/scripts/cleanup-search-analytics.cjs --days=180 --dry-run
    node database/scripts/cleanup-search-analytics.cjs --days=180
*/

const {
  PrismaClient,
} = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

function parseArgs(argv) {
  const daysArg = argv.find((arg) => arg.startsWith("--days="));
  const dryRun = argv.includes("--dry-run");
  const daysRaw = daysArg ? Number(daysArg.split("=")[1]) : 180;
  const retentionDays = Number.isFinite(daysRaw)
    ? Math.max(30, Math.min(1095, Math.floor(daysRaw)))
    : 180;
  return { retentionDays, dryRun };
}

async function hasTables() {
  const rows = await prisma.$queryRaw`
    SELECT
      to_regclass('"SearchHistory"')::text AS "historyTable",
      to_regclass('"SearchQueryMetric"')::text AS "metricTable"
  `;
  return Boolean(rows?.[0]?.historyTable && rows?.[0]?.metricTable);
}

async function main() {
  const { retentionDays, dryRun } = parseArgs(process.argv.slice(2));

  if (!(await hasTables())) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          retentionDays,
          dryRun,
          deletedHistoryRows: 0,
          deletedMetricRows: 0,
          note: "Search analytics tables are not present in this database.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const threshold = new Date(Date.now() - retentionDays * 86_400_000);
  const thresholdDay = new Date(
    Date.UTC(
      threshold.getUTCFullYear(),
      threshold.getUTCMonth(),
      threshold.getUTCDate(),
    ),
  );

  const [historyCountRows, metricCountRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "SearchHistory"
      WHERE "createdAt" < ${threshold}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "SearchQueryMetric"
      WHERE "day" < ${thresholdDay}
    `,
  ]);

  const deletedHistoryRows = Number(historyCountRows?.[0]?.count ?? 0);
  const deletedMetricRows = Number(metricCountRows?.[0]?.count ?? 0);

  if (!dryRun) {
    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM "SearchHistory"
        WHERE "createdAt" < ${threshold}
      `,
      prisma.$executeRaw`
        DELETE FROM "SearchQueryMetric"
        WHERE "day" < ${thresholdDay}
      `,
    ]);
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        retentionDays,
        dryRun,
        threshold: threshold.toISOString(),
        thresholdDay: thresholdDay.toISOString().slice(0, 10),
        deletedHistoryRows,
        deletedMetricRows,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
