/*
 * Vercel builds often run for ordinary UI-only changes. Do not acquire
 * Prisma's schema migration lock unless the repository actually contains a
 * migration that is absent from the connected database.
 *
 * The initial deployment and every later schema change still use
 * `prisma migrate deploy`; this guard only avoids a needless migration lock
 * during normal application deployments.
 */

const { readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const projectRoot = resolve(__dirname, "../..");
const migrationsDirectory = join(projectRoot, "database", "prisma", "migrations");
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("A database URL is required to check Prisma migrations.");
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

// This data-only migration failed before PostgreSQL could execute its first
// statement because an early version referenced a non-existent table. It is
// safe to roll back Prisma's failed-attempt marker: it changes no schema and
// no course data was written. The corrected migration is then applied below.
const retrySafeFailedMigrations = new Set([
  "20260906090000_add_to_be_practice_rules",
]);

function localMigrationNames() {
  return readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function appliedMigrationNames() {
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    return new Set(rows.map((row) => row.migration_name));
  } catch (error) {
    // A fresh database has no migrations table yet, so it must run deploy.
    if (error && typeof error === "object" && error.code === "P2010") return new Set();
    throw error;
  }
}

function runMigrations() {
  const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("Prisma migration deployment failed.");
  }
}

function markMigrationRolledBack(migrationName) {
  const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "resolve", "--rolled-back", migrationName],
    {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(`Could not roll back failed migration marker: ${migrationName}.`);
  }
}

async function resolveRetrySafeFailedMigrations() {
  const failed = await prisma.$queryRawUnsafe(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL',
  );

  for (const { migration_name: migrationName } of failed) {
    if (!retrySafeFailedMigrations.has(migrationName)) continue;

    console.log(`Retrying corrected data migration: ${migrationName}.`);
    markMigrationRolledBack(migrationName);
  }
}

async function main() {
  await resolveRetrySafeFailedMigrations();
  const local = localMigrationNames();
  const applied = await appliedMigrationNames();
  const pending = local.filter((migrationName) => !applied.has(migrationName));

  if (pending.length === 0) {
    console.log("Prisma migrations are current; deployment migration step skipped.");
    return;
  }

  console.log(`Applying ${pending.length} pending Prisma migration(s).`);
  runMigrations();
}

main()
  .catch((error) => {
    console.error("[migrate-if-needed]", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
