"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TourStep = {
  id: "lessons" | "vocabulary" | "profile";
  title: string;
  description: string;
  targetId: string;
};

type OnboardingProfile = {
  name?: string | null;
  dailyGoalMinutes?: number | null;
  welcomeBonusPoints?: number | null;
  guidedTourCompleted?: boolean | null;
  takePlacementTest?: boolean | null;
};

const tourSteps: TourStep[] = [
  {
    id: "lessons",
    title: "Lessons",
    description:
      "This is where your daily lessons are organized by level and goals.",
    targetId: "tour-nav-lessons",
  },
  {
    id: "vocabulary",
    title: "Vocabulary",
    description:
      "Grow your active vocabulary and revise words with spaced practice.",
    targetId: "tour-nav-vocabulary",
  },
  {
    id: "profile",
    title: "Profile",
    description:
      "Update your goals, language settings, and intensity any time.",
    targetId: "tour-nav-profile",
  },
];

export default function DashboardHomePage() {
  const [showTour, setShowTour] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { method: "GET" });
        const payload = await response.json();
        if (active && response.ok && payload?.authenticated && payload?.user) {
          setProfile(payload.user);
          setShowTour(!payload.user.guidedTourCompleted);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const step = tourSteps[tourIndex];
    if (!showTour || !step) return;

    const el = document.getElementById(step.targetId);
    if (!el) return;

    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded");
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded");
    };
  }, [showTour, tourIndex]);

  const dailyGoalMinutes = useMemo(
    () => profile.dailyGoalMinutes ?? 15,
    [profile.dailyGoalMinutes],
  );
  const bonusPoints = useMemo(
    () => profile.welcomeBonusPoints ?? 60,
    [profile.welcomeBonusPoints],
  );
  const userName = profile.name?.trim();
  const currentStep = tourSteps[tourIndex];

  const nextTourStep = () => {
    if (tourIndex >= tourSteps.length - 1) {
      void fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guidedTourCompleted: true }),
      });
      setShowTour(false);
      return;
    }
    setTourIndex((i) => i + 1);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary/15 via-white to-secondary/10 border border-primary/20 p-6">
        <p className="text-sm uppercase tracking-wide text-primary/80">
          Welcome aboard
        </p>
        <h1 className="text-3xl font-bold mt-2">
          {userName ? `Hi, ${userName}.` : "Welcome."} Let us start your first learning win.
        </h1>
        <p className="mt-3 text-gray-700 max-w-2xl">
          Your path is ready. Start your first lesson or take a quick level test
          to personalize recommendations.
        </p>
        <div className="mt-6 flex flex-wrap gap-3" id="tour-first-action">
          <Link href="/courses" className="btn btn-primary">
            Start First Lesson
          </Link>
          <Link href="/dashboard/ai-tutor" className="btn btn-secondary">
            Take Quick Test
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <article className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Daily Progress</h2>
          <p className="text-sm text-gray-600 mt-1">
            Your first day goal: 0/{dailyGoalMinutes} minutes
          </p>
          <div className="mt-4 h-3 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full w-0 bg-primary" />
          </div>
          <p className="mt-3 text-sm text-primary font-medium">
            Complete one lesson to fill your first progress bar.
          </p>
        </article>

        <article className="rounded-xl bg-white border border-amber-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Welcome Bonus</h2>
          <p className="text-sm text-gray-700 mt-2">
            You unlocked {bonusPoints} KRIN points and starter flashcards pack.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800 text-sm">
            Gift active
          </div>
        </article>
      </section>

      {profile.takePlacementTest ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
          Quick test requested during onboarding. Open the AI tutor test flow to
          refine your level.
        </section>
      ) : null}

      {showTour && currentStep ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Guided tour {tourIndex + 1}/{tourSteps.length}
            </p>
            <h3 className="text-xl font-bold mt-2">{currentStep.title}</h3>
            <p className="mt-3 text-gray-700">{currentStep.description}</p>
            <div className="mt-6 flex justify-between">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTour(false)}
                type="button"
              >
                Skip
              </button>
              <button
                className="btn btn-primary"
                onClick={nextTourStep}
                type="button"
              >
                {tourIndex === tourSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
