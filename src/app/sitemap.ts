import type { MetadataRoute } from "next";
import { prisma } from "@/core/server/prisma";

const siteUrl = "https://krin-edtech.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, levels] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true, isTemplate: false, isVisibleInCatalog: true, level: { isPublished: true }, category: { isPublished: true } },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.languageLevel.findMany({ where: { isPublished: true }, select: { code: true, updatedAt: true } }),
  ]);

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/professional`, changeFrequency: "weekly", priority: 0.75 },
    { url: `${siteUrl}/tests`, changeFrequency: "weekly", priority: 0.75 },
    { url: `${siteUrl}/course-finder`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/pricing`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/levels`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/teachers`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/refunds`, changeFrequency: "monthly", priority: 0.3 },
    ...levels.map((level) => ({ url: `${siteUrl}/courses/${level.code.toLowerCase()}`, lastModified: level.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...courses.map((course) => ({ url: `${siteUrl}/courses/${course.slug}`, lastModified: course.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
