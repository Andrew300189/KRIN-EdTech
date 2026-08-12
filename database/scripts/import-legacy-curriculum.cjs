/* One-off, idempotent bootstrap of the original CEFR catalogue into PostgreSQL. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function readLegacyCatalog() {
  const catalogPath = path.join(__dirname, "../../src/modules/courses/data/course-catalog.ts");
  const source = fs.readFileSync(catalogPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    fileName: catalogPath,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require }, { filename: catalogPath });
  if (!module.exports.courseCatalog || typeof module.exports.courseCatalog !== "object") throw new Error("The legacy course catalogue could not be loaded.");
  return module.exports.courseCatalog;
}

async function findNode(prisma, levelId, type, parentId, slug) {
  return prisma.curriculumNode.findFirst({ where: { levelId, type, parentId, slug }, select: { id: true } });
}

async function upsertImportedNode(prisma, data) {
  const existing = await findNode(prisma, data.levelId, data.type, data.parentId, data.slug);
  // A CMS edit is authoritative. The bootstrap creates absent rows only.
  return existing ?? prisma.curriculumNode.create({ data });
}

async function importLegacyCurriculum(prisma) {
  const catalog = readLegacyCatalog();
  const now = new Date();
  const created = { levels: 0, sections: 0, topics: 0 };
  const levelOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];

  for (const levelData of Object.values(catalog)) {
    const existingLevel = await prisma.languageLevel.findUnique({ where: { code: levelData.level } });
    // Direct imports must not overwrite an owner's level title, visibility or
    // lifecycle choice. The normal seed command prepares base level rows.
    const level = existingLevel ?? await prisma.languageLevel.create({
      data: { code: levelData.level, title: levelData.title, description: levelData.description, order: levelOrder.indexOf(levelData.level) + 1, isPublished: true, contentStatus: "PUBLISHED", publishedAt: now },
    });
    created.levels += 1;
    for (const sectionData of levelData.sections) {
      const sectionExisting = await findNode(prisma, level.id, "SECTION", null, sectionData.slug);
      const section = await upsertImportedNode(prisma, {
        levelId: level.id, parentId: null, type: "SECTION", slug: sectionData.slug, title: sectionData.title,
        description: sectionData.description ?? null, locale: "en", showInSearch: true, order: sectionData.order,
        contentStatus: "PUBLISHED", publishedAt: now,
      });
      if (!sectionExisting) created.sections += 1;
      for (const topicData of sectionData.topics) {
        const topicExisting = await findNode(prisma, level.id, "TOPIC", section.id, topicData.slug);
        await upsertImportedNode(prisma, {
          levelId: level.id, parentId: section.id, type: "TOPIC", slug: topicData.slug, title: topicData.title,
          description: topicData.example ? `Example: ${topicData.example}` : null, locale: "en", showInSearch: true,
          order: topicData.order, contentStatus: "PUBLISHED", publishedAt: now,
        });
        if (!topicExisting) created.topics += 1;
      }
    }
  }
  return created;
}

module.exports = { importLegacyCurriculum };

if (require.main === module) {
  const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");
  const prisma = new PrismaClient();
  importLegacyCurriculum(prisma)
    .then((created) => console.log(`Imported curriculum: ${created.sections} sections and ${created.topics} topics.`))
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
