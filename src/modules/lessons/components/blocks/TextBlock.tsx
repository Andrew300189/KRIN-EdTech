import { displayContent, type LessonBlock } from "../lesson-content";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";

export function TextBlock({ block }: { block: LessonBlock }) {
  const text = displayContent(block.content);
  return text
    ? <div className="mt-4 whitespace-pre-wrap leading-7 text-slate-700 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_h3]:font-bold [&_h3]:text-slate-900 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeLessonRichText(text) }} />
    : <p className="mt-4 text-sm text-slate-500">Content for this block is being prepared.</p>;
}
