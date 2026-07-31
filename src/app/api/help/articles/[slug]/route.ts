import { NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const article = await prisma.helpArticle.findFirst({ where: { slug: (await params).slug, status: "PUBLISHED" }, select: { slug: true, title: true, summary: true, content: true, locale: true, publishedAt: true, category: { select: { title: true } } } });
  return article ? NextResponse.json({ article }) : NextResponse.json({ error: "Article not found." }, { status: 404 });
}
