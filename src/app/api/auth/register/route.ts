import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { hashPassword } from "@/core/server/password";
import { createSession } from "@/core/server/session";
import { sendWelcomeVerificationEmail } from "@/core/server/email";

type IncomingLevel = "beginner" | "intermediate" | "advanced";
type IncomingIntensity = "10m" | "30m" | "60m";

function mapLevel(level: IncomingLevel) {
  if (level === "advanced") return "ADVANCED";
  if (level === "intermediate") return "INTERMEDIATE";
  return "BEGINNER";
}

function mapIntensity(value: IncomingIntensity) {
  if (value === "60m") return 60;
  if (value === "30m") return 30;
  return 10;
}

function computeWelcomeBonus(intensityMinutes: number) {
  if (intensityMinutes >= 60) return 120;
  if (intensityMinutes >= 30) return 90;
  return 60;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      targetLanguage,
      learningGoal,
      currentLevel,
      dailyIntensity,
      takePlacementTest,
    } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    if (!targetLanguage || !learningGoal || !currentLevel || !dailyIntensity) {
      return NextResponse.json(
        {
          error:
            "Onboarding fields are required: targetLanguage, learningGoal, currentLevel, dailyIntensity",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    const intensityMinutes = mapIntensity(dailyIntensity as IncomingIntensity);
    const verificationToken = randomBytes(24).toString("hex");
    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        targetLanguage,
        learningGoal,
        currentLevel: mapLevel(currentLevel as IncomingLevel),
        dailyIntensityMinutes: intensityMinutes,
        dailyGoalMinutes: intensityMinutes,
        takePlacementTest: Boolean(takePlacementTest),
        onboardingCompletedAt: new Date(),
        welcomeBonusPoints: computeWelcomeBonus(intensityMinutes),
        guidedTourCompleted: false,
        emailVerificationToken: verificationToken,
        emailVerificationSentAt: new Date(),
      },
    });

    const verificationUrl = `${new URL(request.url).origin}/verify-email?token=${verificationToken}`;

    await sendWelcomeVerificationEmail({
      name: user.name,
      email: user.email,
      verificationUrl,
      targetLanguage: user.targetLanguage,
      learningGoal: user.learningGoal,
    });

    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully. Verification email sent.",
        verificationSent: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          targetLanguage: user.targetLanguage,
          learningGoal: user.learningGoal,
          currentLevel: user.currentLevel,
          dailyIntensityMinutes: user.dailyIntensityMinutes,
          dailyGoalMinutes: user.dailyGoalMinutes,
          takePlacementTest: user.takePlacementTest,
          welcomeBonusPoints: user.welcomeBonusPoints,
          guidedTourCompleted: user.guidedTourCompleted,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
