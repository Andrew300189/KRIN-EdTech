import { NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";

export async function GET() {
  const categories = await prisma.supportCategory.findMany({ where: { isActive: true }, select: { id: true, slug: true, title: true, description: true }, orderBy: { title: "asc" } });
  return NextResponse.json({ categories });
}
