import { NextResponse } from "next/server";
import {
  displayName,
  profileNameParts,
  validateUserProfilePatch,
} from "@/core/server/profile";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";
import { notificationService } from "@/modules/communications/services/notification.service";

export const runtime = "nodejs";

function profileResponse(user: {
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
  interfaceLanguage: string;
  timeZone: string;
  country: string | null;
}) {
  const fallback = profileNameParts(user.name);

  return {
    firstName: user.firstName ?? fallback.firstName,
    lastName: user.lastName ?? fallback.lastName,
    email: user.email,
    avatar: user.avatar,
    interfaceLanguage: user.interfaceLanguage,
    timeZone: user.timeZone,
    country: user.country,
  };
}

export async function GET() {
  const authenticated = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { profile: profileResponse(authenticated.user) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const authenticated = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validation = validateUserProfilePatch(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existing = authenticated.user;
    const fallback = profileNameParts(existing.name);
    const firstName = validation.data.firstName ?? existing.firstName ?? fallback.firstName;
    const lastName =
      validation.data.lastName !== undefined
        ? validation.data.lastName
        : existing.lastName ?? fallback.lastName;

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...validation.data,
        name: displayName(firstName, lastName),
      },
      select: {
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        interfaceLanguage: true,
        timeZone: true,
        country: true,
        updatedAt: true,
      },
    });

    await prisma.userNotificationSettings.updateMany({ where: { userId: existing.id }, data: { locale: updated.interfaceLanguage, timezone: updated.timeZone } });
    try { await notificationService.createNotification({ userId: existing.id, type: "PROFILE_UPDATED", idempotencyKey: `profile-updated:${existing.id}:${updated.updatedAt.toISOString()}`, entityType: "User", entityId: existing.id, title: "Profile updated", message: "Your profile settings have been saved.", actionUrl: "/dashboard/profile", actionLabel: "View profile" }); }
    catch (error) { console.error("[communications] profile notification failed", error); }

    return NextResponse.json(
      { profile: profileResponse(updated) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to save profile changes. Please try again." },
      { status: 500 },
    );
  }
}
