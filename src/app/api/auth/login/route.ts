import { NextRequest, NextResponse } from "next/server";
import { parseRole } from "@/core/utils/role";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // TODO: Validate credentials against database
    // TODO: Generate JWT token

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        token: "sample-jwt-token",
        user: { id: "1", email, name: "User", role: parseRole(role) },
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
