import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { createSession } from "@/core/server/session";

export const runtime = "nodejs";

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

function sanitizeUsername(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "user"
  );
}

async function getUniqueUsername(base: string) {
  let attempt = base;
  let i = 0;

  while (true) {
    const exists = await prisma.user.findUnique({
      where: { username: attempt },
    });
    if (!exists) return attempt;
    i += 1;
    attempt = `${base}-${i}`.slice(0, 30);
  }
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", request.url),
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("krin_google_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/login?error=google_state", request.url),
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL("/login?error=google_failed", request.url),
      );
    }

    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;

    const profileRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      },
    );

    if (!profileRes.ok) {
      return NextResponse.redirect(
        new URL("/login?error=google_failed", request.url),
      );
    }

    const profile = (await profileRes.json()) as GoogleProfile;
    const email = profile.email.toLowerCase();

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const baseUsername = sanitizeUsername(
        profile.email.split("@")[0] || profile.name,
      );
      const username = await getUniqueUsername(baseUsername);

      user = await prisma.user.create({
        data: {
          email,
          username,
          name: profile.name || username,
          passwordHash: `oauth_google_${randomBytes(16).toString("hex")}`,
          avatar: profile.picture,
          emailVerified: true,
          emailVerificationToken: null,
          role: "STUDENT",
          targetLanguage: "english",
          learningGoal: "self",
          currentLevel: "BEGINNER",
          dailyIntensityMinutes: 15,
          dailyGoalMinutes: 15,
          onboardingCompletedAt: new Date(),
          welcomeBonusPoints: 60,
          guidedTourCompleted: false,
          lastLoginAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: profile.picture ?? user.avatar,
          lastLoginAt: new Date(),
          emailVerified: true,
        },
      });
    }

    await createSession(user.id, { headers: request.headers });

    const response = NextResponse.redirect(
      new URL("/dashboard/courses", request.url),
    );
    response.cookies.delete("krin_google_state");
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=google_failed", request.url),
    );
  }
}
