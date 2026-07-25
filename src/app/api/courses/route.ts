import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/core/utils/request-auth";
import { hasAnyRole } from "@/core/utils/role";
import { createCourseForOwner, listCoursesForOwner } from "@/modules/courses/service";

export async function GET(request: NextRequest) {
  try {
    const identity = getRequestIdentity(request);

    if (hasAnyRole(identity.role, ["teacher", "admin"])) {
      const ownerCourses = listCoursesForOwner(identity.userId);
      return NextResponse.json(
        { success: true, data: ownerCourses },
        { status: 200 },
      );
    }

    const courses = [
      { id: "1", title: "English Basics", level: "beginner", visibility: "public" },
      { id: "2", title: "Business English", level: "intermediate", visibility: "public" },
      { id: "3", title: "Advanced Grammar", level: "advanced", visibility: "public" },
    ];

    return NextResponse.json({ success: true, data: courses }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = getRequestIdentity(request);

    if (!hasAnyRole(identity.role, ["teacher", "admin"])) {
      return NextResponse.json(
        { error: "Forbidden: teacher or admin role required" },
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
      visibility,
      status,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully",
        data: created,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
