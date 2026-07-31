"use client";

import { AddToDictionaryButton } from "./AddToDictionaryButton";

type LessonWord = {
  wordId: string;
  role: string;
  isRequired: boolean;
  word: {
    lemma: string;
    partOfSpeech: string | null;
    meanings: Array<{ translation: string | null; definition: string }>;
  };
};

export function LessonVocabularyPanel({ lessonId, words }: { lessonId: string; words: LessonWord[] }) {
  if (!words.length) return null;

  return (
    <section aria-labelledby="lesson-vocabulary" className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Lesson vocabulary</p>
          <h2 id="lesson-vocabulary" className="mt-1 text-2xl font-bold text-slate-900">Words for this lesson</h2>
        </div>
        <p className="text-sm text-slate-600">Add any word to review it later.</p>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {words.map((item) => {
          const meaning = item.word.meanings[0];
          return (
            <li key={item.wordId} className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{item.word.lemma}</p>
                  <p className="mt-1 text-sm text-slate-600">{meaning?.translation ?? meaning?.definition ?? "Meaning is being prepared."}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-700">{item.role}{item.isRequired ? " · Required" : ""}</p>
                </div>
                <AddToDictionaryButton wordId={item.wordId} sourceLessonId={lessonId} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
