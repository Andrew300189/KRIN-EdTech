import { asObject, displayContent, type LessonBlock } from "../lesson-content";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";

export function MediaBlock({ block }: { block: LessonBlock }) {
  const content = asObject(block.content);
  const url = typeof content.url === "string" ? content.url : typeof content.src === "string" ? content.src : null;
  const text = displayContent(block.content);
  return <div className="mt-4 space-y-4">{text ? <div className="whitespace-pre-wrap leading-7 text-slate-700 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_h3]:font-bold [&_h3]:text-slate-900 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeLessonRichText(text) }} /> : null}{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-blue-700 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50">Open media</a> : null}</div>;
}
