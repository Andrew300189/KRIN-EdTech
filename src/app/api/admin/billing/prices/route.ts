import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const schema = z.object({ productId: z.string().trim().min(1).max(191), provider: z.enum(["STRIPE", "LIQPAY"]), currency: z.enum(["USD", "UAH", "EUR"]), amount: z.number().int().positive(), billingPeriod: z.enum(["NONE", "MONTH", "QUARTER", "SEMI_ANNUAL", "YEAR"]), providerProductId: z.string().max(255).optional().nullable(), providerPriceId: z.string().max(255).optional().nullable() });
export async function POST(request: NextRequest) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); const value = schema.safeParse(await request.json().catch(() => null)); if (!value.success) return NextResponse.json({ error: "Invalid price." }, { status: 400 }); try { return NextResponse.json({ price: await prisma.productPrice.create({ data: value.data }) }, { status: 201 }); } catch { return NextResponse.json({ error: "Provider price identifier already exists." }, { status: 409 }); } }
