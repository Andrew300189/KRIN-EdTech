import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/core/utils/request-auth";
import { hasAnyRole } from "@/core/utils/role";
import {
  COURSE_STAGES,
  LEARNING_ACADEMIES,
  createCourseForOwner,
  listCoursesForOwner,
} from "@/modules/courses/service";

export async function GET(request: NextRequest) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (hasAnyRole(identity.role, ["teacher", "admin"])) {
      const ownerCourses = await listCoursesForOwner(identity.userId);
      return NextResponse.json(
        {
          success: true,
            data: ownerCourses,
          catalog: {
            academies: LEARNING_ACADEMIES,
            stages: COURSE_STAGES,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: [],
        catalog: {
          academies: LEARNING_ACADEMIES,
          stages: COURSE_STAGES,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(identity.role, ["teacher", "admin"])) {
      return NextResponse.json(
        { error: "Forbidden: teacher or admin role required" },
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

    const created = await createCourseForOwner(identity.userId, {
      title,
      description,
      level,
      academy,
      path,
      stage,
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
