import { asObject, asStringArray, displayContent, type LessonBlock } from "../lesson-content";

export function VocabularyBlock({ block }: { block: LessonBlock }) {
  const content = asObject(block.content);
  const terms = asStringArray(content.terms);
  const text = displayContent(block.content);
  return <div className="mt-4">{text ? <p className="whitespace-pre-wrap leading-7 text-slate-700">{text}</p> : null}{terms.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{terms.map((term) => <li key={term} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-950">{term}</li>)}</ul> : null}</div>;
}
