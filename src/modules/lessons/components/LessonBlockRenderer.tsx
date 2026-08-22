"use client";

import { ExerciseBlock } from "./blocks/ExerciseBlock";
import { HomeworkBlock } from "./blocks/HomeworkBlock";
import { MediaBlock } from "./blocks/MediaBlock";
import { TextBlock } from "./blocks/TextBlock";
import { VocabularyBlock } from "./blocks/VocabularyBlock";
import type { LessonBlock } from "./lesson-content";

export function LessonBlockRenderer({ block, completed, onToggleComplete, canSaveProgress, previewMode = false, hideHeader = false, playerStyle = false, hideExerciseContext = false, hideExerciseTheoryText = false, onAttemptResolved }: { block: LessonBlock; completed: boolean; onToggleComplete: (blockId: string) => void; canSaveProgress: boolean; previewMode?: boolean; hideHeader?: boolean; playerStyle?: boolean; hideExerciseContext?: boolean; hideExerciseTheoryText?: boolean; onAttemptResolved?: (result: { exerciseId: string; isCorrect: boolean; isFinalExercise: boolean }) => void }) {
  const isExercise = block.type === "EXERCISE";
  const isVocabulary = block.type === "VOCABULARY" || block.type === "PHRASE_OF_THE_DAY";
  const isMedia = block.type === "VIDEO" || block.type === "AUDIO" || block.type === "IMAGE" || block.type === "LISTENING";
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{!hideHeader ? <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{block.type.replace(/_/g, " ")}</p>{block.title ? <h2 className="mt-1 text-2xl font-bold text-slate-900">{block.title}</h2> : null}</div>{block.isRequired ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Required</span> : null}</div> : null}{isExercise ? <ExerciseBlock block={block} completed={completed} previewMode={previewMode} playerStyle={playerStyle} hideContext={hideExerciseContext} hideContextText={hideExerciseTheoryText} onAttemptResolved={onAttemptResolved} /> : block.type === "HOMEWORK" ? <HomeworkBlock block={block} canSaveProgress={canSaveProgress} /> : isVocabulary ? <VocabularyBlock block={block} /> : isMedia ? <MediaBlock block={block} /> : <TextBlock block={block} />}{block.isRequired && canSaveProgress ? <button type="button" onClick={() => onToggleComplete(block.id)} className={`mt-5 rounded-lg px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${completed ? "bg-emerald-100 text-emerald-900" : "border border-blue-700 text-blue-700 hover:bg-blue-50"}`}>{completed ? "Block completed" : "Mark block complete"}</button> : null}</section>;
}
