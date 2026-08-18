"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./OnboardingFlow.module.css";

type Props = {
  name: string;
  initialGoal: string | null;
  initialDailyGoalMinutes: number;
  initialPlacementTest: boolean;
  initialReminderTime: string | null;
  destination: string;
};

const goals = [
  { value: "GENERAL", label: "Build everyday English", description: "Grammar, vocabulary and confident communication." },
  { value: "CONVERSATION", label: "Speak with more confidence", description: "Useful phrases, listening and guided speaking." },
  { value: "TRAVEL", label: "Prepare for travel", description: "Practical English for trips and common situations." },
  { value: "CAREER", label: "Use English at work", description: "Professional vocabulary and communication practice." },
  { value: "EXAMS", label: "Prepare for an exam", description: "A structured path for exam-style practice." },
] as const;

const paces = [
  { value: 5, label: "Very light", description: "5 minutes a day" },
  { value: 10, label: "Light", description: "10 minutes a day" },
  { value: 15, label: "Steady", description: "15 minutes a day" },
  { value: 20, label: "Regular", description: "20 minutes a day" },
  { value: 30, label: "Focused", description: "30 minutes a day" },
  { value: 45, label: "Intensive", description: "45 minutes a day" },
  { value: 60, label: "Extended", description: "60 minutes a day" },
] as const;

function withFirstVisitMarker(destination: string) {
  const url = new URL(destination, window.location.origin);
  url.searchParams.set("firstVisit", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function OnboardingFlow({
  name,
  initialGoal,
  initialDailyGoalMinutes,
  initialPlacementTest,
  initialReminderTime,
  destination,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(
    goals.some((item) => item.value === initialGoal)
      ? (initialGoal as (typeof goals)[number]["value"])
      : "GENERAL",
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
    paces.some((item) => item.value === initialDailyGoalMinutes)
      ? initialDailyGoalMinutes
      : 15,
  );
  const [takePlacementTest, setTakePlacementTest] = useState(initialPlacementTest);
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(initialReminderTime));
  const [dailyReminderTime, setDailyReminderTime] = useState(initialReminderTime ?? "18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningGoal: goal,
          dailyGoalMinutes,
          takePlacementTest,
          dailyReminderTime: reminderEnabled ? dailyReminderTime : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "We could not save your learning plan.");
      }

      router.replace(withFirstVisitMarker(destination));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "We could not save your learning plan.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="onboarding-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Getting started</p>
          <h1 id="onboarding-title">A short plan for {name || "your"} learning</h1>
          <p>Three quick choices help us organise your first steps. You can change them later.</p>
        </header>

        <ol className={styles.steps} aria-label={`Onboarding step ${step + 1} of 3`}>
          {["Goal", "Pace", "Schedule"].map((label, index) => (
            <li
              className={index === step ? styles.stepCurrent : index < step ? styles.stepComplete : styles.stepPending}
              key={label}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <fieldset className={styles.fieldset}>
            <legend>What would you like English to help you do?</legend>
            <div className={styles.choiceGrid}>
              {goals.map((item) => (
                <label className={goal === item.value ? styles.choiceSelected : styles.choice} key={item.value}>
                  <input
                    checked={goal === item.value}
                    name="learningGoal"
                    onChange={() => setGoal(item.value)}
                    type="radio"
                    value={item.value}
                  />
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className={styles.fieldset}>
            <legend>Choose a pace you can keep</legend>
            <p className={styles.fieldsetDescription}>Consistency matters more than intensity. This is a target, never a penalty.</p>
            <div className={styles.choiceGrid}>
              {paces.map((item) => (
                <label className={dailyGoalMinutes === item.value ? styles.choiceSelected : styles.choice} key={item.value}>
                  <input
                    checked={dailyGoalMinutes === item.value}
                    name="dailyGoalMinutes"
                    onChange={() => setDailyGoalMinutes(item.value)}
                    type="radio"
                    value={item.value}
                  />
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </label>
              ))}
            </div>
            <label className={styles.toggleCard}>
              <input
                checked={takePlacementTest}
                onChange={(event) => setTakePlacementTest(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Take a quick level test later</strong>
                <small>Optional. It refines course recommendations without delaying your first lesson.</small>
              </span>
            </label>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className={styles.fieldset}>
            <legend>Set a reminder only if it helps</legend>
            <p className={styles.fieldsetDescription}>A schedule is optional. You can study whenever you have time.</p>
            <label className={styles.toggleCard}>
              <input
                checked={reminderEnabled}
                onChange={(event) => setReminderEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Remind me about my study goal</strong>
                <small>You control reminders in Settings at any time.</small>
              </span>
            </label>
            {reminderEnabled ? (
              <label className={styles.timeField}>
                Preferred reminder time
                <input
                  onChange={(event) => setDailyReminderTime(event.target.value)}
                  type="time"
                  value={dailyReminderTime}
                />
              </label>
            ) : null}
            <div className={styles.readyPanel}>
              <strong>You are ready to begin.</strong>
              <p>Your first course, lesson and progress will be waiting in your learning space.</p>
            </div>
          </fieldset>
        ) : null}

        {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}

        <footer className={styles.actions}>
          <button
            className={styles.secondaryButton}
            disabled={step === 0 || saving}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            type="button"
          >
            Back
          </button>
          {step < 2 ? (
            <button className={styles.primaryButton} onClick={() => setStep((value) => value + 1)} type="button">
              Continue
            </button>
          ) : (
            <button className={styles.primaryButton} disabled={saving} onClick={() => void submit()} type="button">
              {saving ? "Saving your plan…" : "Start learning"}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
