"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./StudentCourses.module.css";

export type VocabularyPreviewItem = {
  id: string; kind: "GLOBAL" | "CUSTOM"; term: string; translation: string; status: string; masteryLevel: number;
};

export type VocabularySummary = {
  total: number; newCount: number; learning: number; mastered: number; due: number;
};

export type VocabularyQuickSettings = {
  dailyGoal: number; maxSessionSize: number; showTranscription: boolean; dailyReminderEnabled: boolean;
};

type StudentVocabularySectionProps = {
  initialItems: VocabularyPreviewItem[];
  summary: VocabularySummary;
  initialSettings: VocabularyQuickSettings;
};

export function StudentVocabularySection({ initialItems, summary, initialSettings }: StudentVocabularySectionProps) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [addError, setAddError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const notLearned = summary.newCount + summary.learning;
  const trackProgress = Math.round((summary.mastered / Math.max(1, notLearned + summary.mastered)) * 100);

  useEffect(() => { setSettings(initialSettings); }, [initialSettings]);

  async function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding || !term.trim() || !translation.trim()) return;
    setAdding(true); setAddMessage(""); setAddError(false);
    try {
      const response = await fetch("/api/profile/vocabulary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ term, translation }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to add this word.");
      setTerm(""); setTranslation(""); setAddMessage("Added to your word course."); router.refresh();
    } catch (error) { setAddError(true); setAddMessage(error instanceof Error ? error.message : "Unable to add this word."); }
    finally { setAdding(false); }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true); setSettingsMessage("");
    try {
      const response = await fetch("/api/profile/vocabulary/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (!response.ok) throw new Error();
      setSettingsMessage("Saved."); router.refresh();
    } catch { setSettingsMessage("Settings could not be saved. Try again."); }
    finally { setSavingSettings(false); }
  }

  const trainingLabel = summary.due ? `Review ${summary.due} due word${summary.due === 1 ? "" : "s"}` : notLearned ? "Start today’s practice" : "Build my word course";

  return <section id="vocabulary" className={styles.vocabularySection} aria-labelledby="vocabulary-heading">
    <header className={styles.vocabularyHeader}>
      <div><p className={styles.eyebrow}>Personal word course</p><h2 id="vocabulary-heading">Vocabulary</h2><p>Every saved word becomes part of a short, personal practice track.</p></div>
      <Link href="/profile/vocabulary/training" className={styles.primaryAction}>{trainingLabel}</Link>
    </header>

    <div className={styles.vocabularyGrid}>
      <section className={styles.wordTrack} aria-label="Your vocabulary track">
        <div className={styles.wordCount}><strong>{notLearned}</strong><div><span>words still to learn</span><p>{summary.total ? `${summary.mastered} mastered out of ${summary.total} saved` : "Add your first word to begin."}</p></div></div>
        <div className={styles.trackProgress}><div><span>My word course</span><strong>{trackProgress}%</strong></div><div className={styles.progressTrack} aria-label={`${trackProgress}% of the word course mastered`}><div className={styles.progressFill} style={{ width: `${trackProgress}%` }} /></div><ol className={styles.trackSteps}><li className={summary.total ? styles.trackStepDone : undefined}>Add</li><li className={notLearned ? styles.trackStepCurrent : undefined}>Learn</li><li className={summary.due ? styles.trackStepCurrent : undefined}>Review</li><li className={summary.mastered ? styles.trackStepDone : undefined}>Master</li></ol></div>
      </section>

      <form className={styles.quickAddForm} onSubmit={(event) => void addWord(event)}>
        <div><p className={styles.quickAddTitle}>Add a word in seconds</p><p className={styles.quickAddText}>Keep it simple: word, meaning, done.</p></div>
        <div className={styles.quickAddFields}><label><span>Word or phrase</span><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="e.g. reliable" required disabled={adding} /></label><label><span>Meaning</span><input value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="e.g. dependable" required disabled={adding} /></label><button type="submit" className={styles.addWordButton} disabled={adding}>{adding ? "Adding…" : "Add word"}</button></div>
        {addMessage ? <p className={addError ? styles.addError : styles.addSuccess} role="status">{addMessage}</p> : null}
      </form>
    </div>

    <div className={styles.vocabularyLower}>
      <section className={styles.wordPreview} aria-label="Words in your personal course">
        <div className={styles.vocabularySubheading}><div><h3>Next words</h3><p>{summary.due ? `${summary.due} ready for review today` : "Your next words appear here as you add them."}</p></div><Link href="/profile/vocabulary/training">Open practice</Link></div>
        {initialItems.length ? <ul className={styles.wordList}>{initialItems.map((item) => <li key={`${item.kind}-${item.id}`}><div><strong>{item.term}</strong><span>{item.translation}</span></div><div><em>{item.status.toLowerCase()}</em><b>{item.masteryLevel}%</b></div></li>)}</ul> : <div className={styles.wordEmpty}><strong>Your word course is waiting.</strong><p>Add a word from a lesson or use the quick form above.</p></div>}
      </section>

      <details className={styles.vocabularySettings}>
        <summary><span><strong>Vocabulary settings</strong><small>{settings.dailyGoal} words a day · {settings.maxSessionSize} per session</small></span><span aria-hidden="true">⌄</span></summary>
        <form onSubmit={(event) => void saveSettings(event)}><label>Daily goal<input type="number" min="1" max="100" value={settings.dailyGoal} onChange={(event) => setSettings((current) => ({ ...current, dailyGoal: Number(event.target.value) }))} /></label><label>Words per session<input type="number" min="1" max="50" value={settings.maxSessionSize} onChange={(event) => setSettings((current) => ({ ...current, maxSessionSize: Number(event.target.value) }))} /></label><label className={styles.settingToggle}><input type="checkbox" checked={settings.showTranscription} onChange={(event) => setSettings((current) => ({ ...current, showTranscription: event.target.checked }))} />Show transcription</label><label className={styles.settingToggle}><input type="checkbox" checked={settings.dailyReminderEnabled} onChange={(event) => setSettings((current) => ({ ...current, dailyReminderEnabled: event.target.checked }))} />Daily reminder</label><div className={styles.settingsActions}><button type="submit" disabled={savingSettings}>{savingSettings ? "Saving…" : "Save settings"}</button><Link href="/profile/settings/vocabulary">All settings</Link></div>{settingsMessage ? <p className={styles.settingsMessage} role="status">{settingsMessage}</p> : null}</form>
      </details>
    </div>
  </section>;
}
