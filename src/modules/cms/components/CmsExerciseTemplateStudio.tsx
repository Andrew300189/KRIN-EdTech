"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";
import { preventNumericKey, sanitizeLanguageValue, splitLanguageLines } from "@/modules/cms/utils/language-input";
import styles from "./CmsExerciseTemplates.module.css";

type Engine = {
  key: string;
  engine: string;
  title: string;
  description: string;
  renderer: string;
};

type Definition = { subtype: string; title: string };

type Result = { correct: boolean; expected: string } | null;

function languageValue(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, setValue: (value: string) => void) {
  setValue(sanitizeLanguageValue(event.target.value));
}

function noDigitKey(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  preventNumericKey(event);
}

function displayValues(values: string[]) {
  return values.length ? values.join(" · ") : "Add language values first.";
}

function parsePairs(value: string) {
  return Object.fromEntries(splitLanguageLines(value).flatMap((line) => {
    const [left, ...right] = line.split("=");
    const key = left?.trim();
    const target = right.join("=").trim();
    return key && target ? [[key, target]] : [];
  }));
}

export function CmsExerciseTemplateStudio({ engine, definitions }: { engine: Engine; definitions: Definition[] }) {
  const [instruction, setInstruction] = useState("Read the language prompt and choose the best answer.");
  const [question, setQuestion] = useState("Write a language question here.");
  const [optionsText, setOptionsText] = useState("example\nalternative\ncontext");
  const [correctText, setCorrectText] = useState("example");
  const [leftText, setLeftText] = useState("Term one\nTerm two\nTerm three");
  const [rightText, setRightText] = useState("Meaning one\nMeaning two\nMeaning three");
  const [pairsText, setPairsText] = useState("Term one = Meaning one\nTerm two = Meaning two\nTerm three = Meaning three");
  const [categoriesText, setCategoriesText] = useState("Correct\nIncorrect");
  const [itemsText, setItemsText] = useState("Example one\nExample two");
  const [sourceText, setSourceText] = useState("Add a reading passage, dialogue transcript or media transcript here.");
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [orderedAnswer, setOrderedAnswer] = useState<string[]>([]);
  const [mappedAnswer, setMappedAnswer] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result>(null);

  const options = useMemo(() => splitLanguageLines(optionsText), [optionsText]);
  const left = useMemo(() => splitLanguageLines(leftText), [leftText]);
  const right = useMemo(() => splitLanguageLines(rightText), [rightText]);
  const categories = useMemo(() => splitLanguageLines(categoriesText), [categoriesText]);
  const items = useMemo(() => splitLanguageLines(itemsText), [itemsText]);
  const correctValues = useMemo(() => splitLanguageLines(correctText), [correctText]);
  const multipleChoice = engine.key === "multiple-choice";
  const choiceRenderer = engine.renderer === "choice" || engine.renderer === "audio-choice" || engine.renderer === "hotspot";
  const matchingRenderer = engine.renderer === "matching";
  const orderingRenderer = engine.renderer === "ordering" || engine.renderer === "word-bank";
  const classificationRenderer = engine.renderer === "classification";
  const needsSource = engine.renderer === "passage" || engine.renderer === "media" || engine.renderer === "audio-choice" || engine.renderer === "recording";
  const longResponse = engine.renderer === "long-text" || engine.renderer === "recording" || engine.renderer === "media";

  function resetResult() {
    setResult(null);
  }

  function toggleChoice(value: string) {
    resetResult();
    setSelectedOptions((current) => multipleChoice
      ? current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      : [value]);
  }

  function selectToken(token: string) {
    resetResult();
    setOrderedAnswer((current) => [...current, token]);
  }

  function checkAnswer() {
    let correct = false;
    let expected = correctText || "a configured language answer";
    if (choiceRenderer) {
      const submitted = multipleChoice ? selectedOptions : selectedOptions[0] ?? "";
      const answer = multipleChoice ? correctValues : correctValues[0] ?? "";
      correct = answerMatches(submitted, answer, [], {});
    } else if (matchingRenderer || classificationRenderer) {
      const expectedPairs = parsePairs(pairsText);
      correct = answerMatches(mappedAnswer, expectedPairs, [], {});
      expected = pairsText || "a configured mapping";
    } else if (orderingRenderer) {
      correct = answerMatches(orderedAnswer, correctValues, [], { preserveOrder: true });
      expected = displayValues(correctValues);
    } else {
      const alternatives = correctValues.slice(1);
      correct = answerMatches(textAnswer, correctValues[0] ?? "", alternatives, {});
      expected = displayValues(correctValues);
    }
    setResult({ correct, expected });
  }

  function clearAttempt() {
    setTextAnswer("");
    setSelectedOptions([]);
    setOrderedAnswer([]);
    setMappedAnswer({});
    setResult(null);
  }

  const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100";
  const areaClass = `${inputClass} min-h-24 resize-y`;

  return <div className={styles.studio}>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Authoring sandbox</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Configure language values</h2></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">{engine.engine}</span></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Use words, phrases and punctuation. Digits are blocked in every authoring and response field.</p>
      <div className="mt-5 grid gap-4">
        <label className="text-sm font-semibold text-slate-700">Instruction<input value={instruction} onChange={(event) => languageValue(event, setInstruction)} onKeyDown={noDigitKey} className={inputClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Question<textarea value={question} onChange={(event) => languageValue(event, setQuestion)} onKeyDown={noDigitKey} className={areaClass} /></label>
        {needsSource ? <label className="text-sm font-semibold text-slate-700">Source text or transcript<textarea value={sourceText} onChange={(event) => languageValue(event, setSourceText)} onKeyDown={noDigitKey} className={areaClass} /></label> : null}
        {choiceRenderer ? <><label className="text-sm font-semibold text-slate-700">Options — one per line<textarea value={optionsText} onChange={(event) => languageValue(event, setOptionsText)} onKeyDown={noDigitKey} className={areaClass} /></label><label className="text-sm font-semibold text-slate-700">Correct answer{multipleChoice ? "s" : ""} — one per line<textarea value={correctText} onChange={(event) => languageValue(event, setCorrectText)} onKeyDown={noDigitKey} className={areaClass} /></label></> : null}
        {matchingRenderer ? <><label className="text-sm font-semibold text-slate-700">Left items — one per line<textarea value={leftText} onChange={(event) => languageValue(event, setLeftText)} onKeyDown={noDigitKey} className={areaClass} /></label><label className="text-sm font-semibold text-slate-700">Right items — one per line<textarea value={rightText} onChange={(event) => languageValue(event, setRightText)} onKeyDown={noDigitKey} className={areaClass} /></label><label className="text-sm font-semibold text-slate-700">Correct pairs — left = right<textarea value={pairsText} onChange={(event) => languageValue(event, setPairsText)} onKeyDown={noDigitKey} className={areaClass} /></label></> : null}
        {classificationRenderer ? <><label className="text-sm font-semibold text-slate-700">Categories — one per line<textarea value={categoriesText} onChange={(event) => languageValue(event, setCategoriesText)} onKeyDown={noDigitKey} className={areaClass} /></label><label className="text-sm font-semibold text-slate-700">Items — one per line<textarea value={itemsText} onChange={(event) => languageValue(event, setItemsText)} onKeyDown={noDigitKey} className={areaClass} /></label><label className="text-sm font-semibold text-slate-700">Correct categories — item = category<textarea value={pairsText} onChange={(event) => languageValue(event, setPairsText)} onKeyDown={noDigitKey} className={areaClass} /></label></> : null}
        {orderingRenderer ? <><label className="text-sm font-semibold text-slate-700">Available tokens — one per line<textarea value={optionsText} onChange={(event) => languageValue(event, setOptionsText)} onKeyDown={noDigitKey} className={areaClass} /></label><label className="text-sm font-semibold text-slate-700">Correct order — one token per line<textarea value={correctText} onChange={(event) => languageValue(event, setCorrectText)} onKeyDown={noDigitKey} className={areaClass} /></label></> : null}
        {!choiceRenderer && !matchingRenderer && !classificationRenderer && !orderingRenderer ? <label className="text-sm font-semibold text-slate-700">Accepted answer — one alternative per line<textarea value={correctText} onChange={(event) => languageValue(event, setCorrectText)} onKeyDown={noDigitKey} className={areaClass} /></label> : null}
        {definitions.length ? <p className="text-xs leading-5 text-slate-500">Supported learning formats: {definitions.map((definition) => definition.title).join(" · ")}</p> : null}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Learner preview</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">Test the exercise</h2>
      <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800">{instruction || "Add an instruction."}</p>
      {needsSource ? <article className="mt-4 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{sourceText || "Add source text in the authoring panel."}</article> : null}
      <p className="mt-4 text-base text-slate-800">{question || "Add a question in the authoring panel."}</p>
      <div className="mt-5 space-y-3">
        {choiceRenderer ? options.length ? options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 transition hover:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100"><input type={multipleChoice ? "checkbox" : "radio"} name="sandbox-answer" checked={selectedOptions.includes(option)} onChange={() => toggleChoice(option)} /><span>{option}</span></label>) : <p className="text-sm text-slate-500">Add at least one option.</p> : null}
        {matchingRenderer ? left.map((item) => <label key={item} className="grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{item}</span><select value={mappedAnswer[item] ?? ""} onChange={(event) => { resetResult(); setMappedAnswer((current) => ({ ...current, [item]: event.target.value })); }} className={inputClass}><option value="">Choose a match</option>{right.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>) : null}
        {classificationRenderer ? items.map((item) => <label key={item} className="grid gap-2 text-sm font-medium text-slate-800 sm:grid-cols-2 sm:items-center"><span>{item}</span><select value={mappedAnswer[item] ?? ""} onChange={(event) => { resetResult(); setMappedAnswer((current) => ({ ...current, [item]: event.target.value })); }} className={inputClass}><option value="">Choose a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>) : null}
        {orderingRenderer ? <><div className="flex flex-wrap gap-2">{options.map((token, index) => <button key={`${token}-${index}`} type="button" onClick={() => selectToken(token)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-violet-400 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100">{token}</button>)}</div><ol className="flex min-h-16 flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">{orderedAnswer.map((token, index) => <li key={`${token}-${index}`}><button type="button" onClick={() => { resetResult(); setOrderedAnswer((current) => current.filter((_, position) => position !== index)); }} className="rounded-lg bg-violet-100 px-2 py-1 text-sm font-medium text-violet-950">{token}</button></li>)}</ol></> : null}
        {!choiceRenderer && !matchingRenderer && !classificationRenderer && !orderingRenderer ? <label className="block"><span className="sr-only">Your answer</span>{longResponse ? <textarea value={textAnswer} onChange={(event) => languageValue(event, setTextAnswer)} onKeyDown={noDigitKey} className={areaClass} placeholder="Write your language response" /> : <input value={textAnswer} onChange={(event) => languageValue(event, setTextAnswer)} onKeyDown={noDigitKey} className={inputClass} placeholder="Write your language response" />}</label> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={checkAnswer} className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-200">Check result</button><button type="button" onClick={clearAttempt} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200">Reset attempt</button></div>
      {result ? <div role="status" className={`mt-5 rounded-xl border p-4 text-sm ${result.correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}><p className="font-bold">{result.correct ? "Correct — the configured answer was accepted." : "Not correct yet."}</p>{!result.correct ? <p className="mt-1">Expected: {result.expected}</p> : null}</div> : null}
    </section>
  </div>;
}
