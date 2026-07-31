import { ExerciseRenderer } from "../ExerciseRenderer";
import { type LessonBlock } from "../lesson-content";

export function ExerciseBlock({ block }: { block: LessonBlock }) {
  return block.exercises.length ? <div className="mt-5 space-y-4">{block.exercises.map((exercise) => <ExerciseRenderer key={exercise.id} exercise={exercise} />)}</div> : <p className="mt-4 text-sm text-slate-500">Exercises for this block are being prepared.</p>;
}
