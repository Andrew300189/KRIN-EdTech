import { ExerciseRenderer } from "../ExerciseRenderer";
import { type LessonBlock } from "../lesson-content";

export function ExerciseBlock({ block, previewMode = false, hideContext = false, hideContextText = false, onAttemptResolved }: { block: LessonBlock; previewMode?: boolean; hideContext?: boolean; hideContextText?: boolean; onAttemptResolved?: (result: { isCorrect: boolean }) => void }) {
  return block.exercises.length ? <div className="mt-5 space-y-4">{block.exercises.map((exercise) => <ExerciseRenderer key={exercise.id} exercise={exercise} previewMode={previewMode} hideContext={hideContext} hideContextText={hideContextText} onAttemptResolved={onAttemptResolved} />)}</div> : <p className="mt-4 text-sm text-slate-500">Exercises for this block are being prepared.</p>;
}
