"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LearningGoal = "travel" | "business" | "exam" | "self";
type Level = "beginner" | "intermediate" | "advanced";
type Intensity = "10m" | "30m" | "60m";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  targetLanguage: string;
  learningGoal: LearningGoal | "";
  currentLevel: Level | "";
  dailyIntensity: Intensity | "";
  takePlacementTest: boolean;
};

const languages = [
  { value: "english", label: "English", emoji: "EN" },
  { value: "spanish", label: "Spanish", emoji: "ES" },
  { value: "german", label: "German", emoji: "DE" },
  { value: "french", label: "French", emoji: "FR" },
];

const goals: Array<{ value: LearningGoal; title: string; subtitle: string; icon: string }> = [
  {
    value: "travel",
    title: "For Travel",
    subtitle: "Speak confidently in real life situations.",
    icon: "✈",
  },
  {
    value: "business",
    title: "For Work & Business",
    subtitle: "Present, negotiate, and write professionally.",
    icon: "💼",
  },
  {
    value: "exam",
    title: "For IELTS / TOEFL",
    subtitle: "Focus on score strategies and exam format.",
    icon: "🎯",
  },
  {
    value: "self",
    title: "For Self-Development",
    subtitle: "Build fluency as a long-term personal skill.",
    icon: "🌱",
  },
];

const levels: Array<{ value: Level; title: string; subtitle: string }> = [
  {
    value: "beginner",
    title: "Beginner",
    subtitle: "I know only basics and simple phrases.",
  },
  {
    value: "intermediate",
    title: "Intermediate",
    subtitle: "I can communicate but make frequent mistakes.",
  },
  {
    value: "advanced",
    title: "Advanced",
    subtitle: "I speak confidently and polish accuracy.",
  },
];

const intensities: Array<{ value: Intensity; title: string; subtitle: string; points: number }> = [
  { value: "10m", title: "10 minutes", subtitle: "Light daily habit", points: 10 },
  { value: "30m", title: "30 minutes", subtitle: "Balanced progress", points: 20 },
  { value: "60m", title: "1 hour", subtitle: "Fast-track growth", points: 30 },
];

const stepTitles = [
  "Account",
  "Language",
  "Learning Goal",
  "Current Level",
  "Daily Intensity",
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    targetLanguage: "english",
    learningGoal: "",
    currentLevel: "",
    dailyIntensity: "",
    takePlacementTest: false,
  });

  const progress = useMemo(() => ((step + 1) / stepTitles.length) * 100, [step]);

  const updateField = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const validateStep = () => {
    if (step === 0) {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        return "Please fill in all account fields.";
      }
      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match.";
      }
      if (formData.password.length < 6) {
        return "Password should be at least 6 characters.";
      }
    }

    if (step === 1 && !formData.targetLanguage) {
      return "Please choose a language.";
    }

    if (step === 2 && !formData.learningGoal) {
      return "Please choose your learning goal.";
    }

    if (step === 3 && !formData.currentLevel && !formData.takePlacementTest) {
      return "Choose a level or take a quick placement test.";
    }

    if (step === 4 && !formData.dailyIntensity) {
      return "Please choose daily intensity.";
    }

    return "";
  };

  const handleNext = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    if (step < stepTitles.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = async () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Registration failed");
        return;
      }

      setShowSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-control w-full"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-control w-full"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control w-full"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-control w-full"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              required
            />
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div>
          <p className="text-sm text-gray-600 mb-4">Which language do you want to learn?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {languages.map((language) => {
              const active = formData.targetLanguage === language.value;
              return (
                <button
                  key={language.value}
                  type="button"
                  onClick={() => updateField("targetLanguage", language.value)}
                  className={`p-4 rounded-xl border text-left transition ${
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-2" aria-hidden>
                    {language.emoji}
                  </div>
                  <div className="font-semibold">{language.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div>
          <p className="text-sm text-gray-600 mb-4">What is your main goal?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {goals.map((goal) => {
              const active = formData.learningGoal === goal.value;
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => updateField("learningGoal", goal.value)}
                  className={`p-4 rounded-xl border text-left transition ${
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-2" aria-hidden>
                    {goal.icon}
                  </div>
                  <div className="font-semibold">{goal.title}</div>
                  <p className="text-sm text-gray-600 mt-1">{goal.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div>
          <p className="text-sm text-gray-600 mb-4">Choose your level by intuition or take a quick test.</p>
          <div className="grid gap-3">
            {levels.map((level) => {
              const active = formData.currentLevel === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => {
                    updateField("currentLevel", level.value);
                    updateField("takePlacementTest", false);
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold">{level.title}</div>
                  <p className="text-sm text-gray-600 mt-1">{level.subtitle}</p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              updateField("takePlacementTest", true);
              updateField("currentLevel", "intermediate");
            }}
            className={`mt-4 w-full p-4 rounded-xl border transition text-left ${
              formData.takePlacementTest
                ? "border-primary bg-primary/10"
                : "border-dashed border-gray-300 hover:border-primary/60"
            }`}
          >
            <div className="font-semibold">Take a quick placement test</div>
            <p className="text-sm text-gray-600 mt-1">
              We will estimate your level in about 3 minutes.
            </p>
          </button>
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm text-gray-600 mb-4">How much time can you invest daily?</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {intensities.map((intensity) => {
            const active = formData.dailyIntensity === intensity.value;
            return (
              <button
                key={intensity.value}
                type="button"
                onClick={() => updateField("dailyIntensity", intensity.value)}
                className={`p-4 rounded-xl border text-left transition ${
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-gray-200 hover:border-primary/50"
                }`}
              >
                <div className="font-semibold">{intensity.title}</div>
                <p className="text-sm text-gray-600 mt-1">{intensity.subtitle}</p>
                <p className="text-xs mt-3 text-primary">Daily goal: {intensity.points} pts</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-8 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gray-100">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-2 mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">Step {step + 1} of {stepTitles.length}</p>
          <h1 className="text-2xl font-bold mt-1">{stepTitles[step]}</h1>
        </div>

        {renderStep()}

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || loading}
            className="btn btn-secondary"
          >
            Back
          </button>

          {step < stepTitles.length - 1 ? (
            <button type="button" onClick={handleNext} className="btn btn-primary">
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {showSuccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              ✓
            </div>
            <h2 className="text-2xl font-bold">Registration successful</h2>
            <p className="mt-3 text-gray-700">
              Welcome to the team, {formData.name}! A verification email has been sent to {formData.email}.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Check your inbox and click the activation link to verify your account.
            </p>

            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="font-semibold">Welcome Email Includes:</p>
              <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                <li>Activation button</li>
                <li>Quick start guide</li>
                <li>Your personalized learning setup</li>
              </ul>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSuccess(false)}
                type="button"
              >
                Stay Here
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSuccess ? (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-md">
          Welcome to the team, {formData.name}! Verification email sent.
        </div>
      ) : null}
    </>
  );
}
