import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const planSchema = z.object({ code: z.enum(["FREE", "BASIC", "PREMIUM", "PRO", "CORPORATE"]), slug: z.string().min(3).max(120), title: z.string().min(2).max(120), description: z.string().min(2).max(1000), type: z.enum(["SUBSCRIPTION", "ONE_TIME"]), billingPeriod: z.enum(["NONE", "MONTH", "QUARTER", "SEMI_ANNUAL", "YEAR"]), priceAmount: z.number().int().min(0), currency: z.enum(["USD", "UAH", "EUR"]), trialDays: z.number().int().min(0).max(90).default(0), isPublic: z.boolean().default(true), isFeatured: z.boolean().default(false) });

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ plans: await prisma.plan.findMany({ include: { prices: true, features: { include: { feature: true } } }, orderBy: { order: "asc" } }) });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const value = planSchema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  try { return NextResponse.json({ plan: await prisma.plan.create({ data: value.data }) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Plan code or slug already exists." }, { status: 409 }); }
}
