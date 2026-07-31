import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  const locale = request.nextUrl.searchParams.get("locale") || "en";
  const articles = await prisma.helpArticle.findMany({ where: { status: "PUBLISHED", locale, ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { summary: { contains: query, mode: "insensitive" } }, { content: { contains: query, mode: "insensitive" } }] } : {}) }, select: { slug: true, title: true, summary: true, publishedAt: true, category: { select: { title: true, slug: true } } }, orderBy: { publishedAt: "desc" }, take: 30 });
  return NextResponse.json({ articles });
}
