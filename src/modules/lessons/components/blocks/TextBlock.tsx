import { displayContent, type LessonBlock } from "../lesson-content";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";

export function TextBlock({ block }: { block: LessonBlock }) {
  const text = displayContent(block.content);
  return text
    ? <div className="lesson-rich-content mt-4 whitespace-pre-wrap leading-7 text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeLessonRichText(text) }} />
    : <p className="mt-4 text-sm text-slate-500">Content for this block is being prepared.</p>;
}
