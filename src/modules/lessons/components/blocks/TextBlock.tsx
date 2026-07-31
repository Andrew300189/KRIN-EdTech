import { displayContent, type LessonBlock } from "../lesson-content";

export function TextBlock({ block }: { block: LessonBlock }) {
  const text = displayContent(block.content);
  return text ? <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{text}</p> : <p className="mt-4 text-sm text-slate-500">Content for this block is being prepared.</p>;
}
