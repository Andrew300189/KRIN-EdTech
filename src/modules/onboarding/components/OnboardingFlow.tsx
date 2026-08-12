"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export function OnboardingFlow({ name, initialGoal, initialDailyGoalMinutes, initialPlacementTest, initialReminderTime, destination }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(goals.some((item) => item.value === initialGoal) ? initialGoal as (typeof goals)[number]["value"] : "GENERAL");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(paces.some((item) => item.value === initialDailyGoalMinutes) ? initialDailyGoalMinutes : 15);
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
        body: JSON.stringify({ learningGoal: goal, dailyGoalMinutes, takePlacementTest, dailyReminderTime: reminderEnabled ? dailyReminderTime : null }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "We could not save your learning plan.");
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not save your learning plan.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
    <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Getting started</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">A short plan for {name || "your"} learning</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Three quick choices help us organise your first steps. You can change all of them later.</p>
      <ol className="mt-7 grid grid-cols-3 gap-2" aria-label={`Onboarding step ${step + 1} of 3`}>
        {["Goal", "Pace", "Schedule"].map((label, index) => <li key={label} className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${index === step ? "bg-blue-700 text-white" : index < step ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}>{index + 1}. {label}</li>)}
      </ol>

      {step === 0 ? <fieldset className="mt-8"><legend className="text-xl font-bold text-slate-950">What would you like English to help you do?</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{goals.map((item) => <label key={item.value} className={`cursor-pointer rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-blue-600 ${goal === item.value ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}><input className="sr-only" type="radio" name="learningGoal" value={item.value} checked={goal === item.value} onChange={() => setGoal(item.value)} /><span className="block font-semibold text-slate-950">{item.label}</span><span className="mt-1 block text-sm text-slate-600">{item.description}</span></label>)}</div></fieldset> : null}

      {step === 1 ? <fieldset className="mt-8"><legend className="text-xl font-bold text-slate-950">Choose a pace you can keep</legend><p className="mt-2 text-sm text-slate-600">Consistency matters more than intensity. This is a target, never a penalty.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{paces.map((item) => <label key={item.value} className={`cursor-pointer rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-blue-600 ${dailyGoalMinutes === item.value ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}><input className="sr-only" type="radio" name="dailyGoalMinutes" value={item.value} checked={dailyGoalMinutes === item.value} onChange={() => setDailyGoalMinutes(item.value)} /><span className="block font-semibold text-slate-950">{item.label}</span><span className="mt-1 block text-sm text-slate-600">{item.description}</span></label>)}</div><label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input className="mt-1 h-4 w-4" type="checkbox" checked={takePlacementTest} onChange={(event) => setTakePlacementTest(event.target.checked)} /><span><span className="block font-semibold text-slate-950">Take a quick level test later</span><span className="mt-1 block text-sm text-slate-600">Optional. It helps refine course recommendations without delaying your first lesson.</span></span></label></fieldset> : null}

      {step === 2 ? <fieldset className="mt-8"><legend className="text-xl font-bold text-slate-950">Set a reminder only if it helps</legend><p className="mt-2 text-sm text-slate-600">A schedule is optional. You can study whenever you have time.</p><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input className="mt-1 h-4 w-4" type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} /><span><span className="block font-semibold text-slate-950">Remind me about my study goal</span><span className="mt-1 block text-sm text-slate-600">You control reminders in Settings at any time.</span></span></label>{reminderEnabled ? <label className="mt-5 block max-w-xs text-sm font-semibold text-slate-800">Preferred reminder time<input type="time" value={dailyReminderTime} onChange={(event) => setDailyReminderTime(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label> : null}<div className="mt-7 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold text-slate-950">You are ready to begin.</p><p className="mt-1">Your first course, lesson and progress will be waiting in your learning space.</p></div></fieldset> : null}

      {error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <div className="mt-8 flex items-center justify-between gap-3"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || saving} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Back</button>{step < 2 ? <button type="button" onClick={() => setStep((value) => value + 1)} className="min-h-11 rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">Continue</button> : <button type="button" onClick={() => void submit()} disabled={saving} className="min-h-11 rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving your plan…" : "Start learning"}</button>}</div>
    </section>
  </main>;
}
