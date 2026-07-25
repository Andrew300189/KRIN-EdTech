import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/core/utils/request-auth";
import { hasAnyRole } from "@/core/utils/role";
import { createCourseForOwner } from "@/modules/courses/service";

export async function POST(request: NextRequest) {
  const identity = await getRequestIdentity(request);

  if (!hasAnyRole(identity.role, ["admin"])) {
    return NextResponse.json(
      { error: "Forbidden: admin role required" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { title, description, level, visibility, status } = body ?? {};

  if (!title || !description || !level) {
    return NextResponse.json(
      { error: "title, description and level are required" },
      { status: 400 },
    );
  }

  const created = createCourseForOwner(identity.userId, {
    title,
    description,
    level,
    visibility: visibility ?? "public",
    status: status ?? "published",
  });

  return NextResponse.json(
    { success: true, message: "Course created by admin", data: created },
    { status: 201 },
  );
}
