import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/core/utils/request-auth";
import { hasAnyRole } from "@/core/utils/role";
import { createCourseForOwner } from "@/modules/courses/service";

export async function POST(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(identity.role, ["admin"])) {
    return NextResponse.json(
      { error: "Forbidden: admin role required" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const {
    title,
    description,
    level,
    academy,
    path,
    stage,
    visibility,
    status,
  } = body ?? {};

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
    academy,
    path,
    stage,
    visibility: visibility ?? "public",
    status: status ?? "published",
  });

  return NextResponse.json(
    { success: true, message: "Course created by admin", data: created },
    { status: 201 },
  );
}
