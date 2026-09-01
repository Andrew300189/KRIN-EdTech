"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppModal } from "@/core/components/AppModal";
import {
  EXERCISE_ENGINES,
  getDefaultExerciseSubtype,
  getExerciseEngine,
  normalizeExerciseEngineKey,
  type ExerciseEngineKey,
} from "@/modules/cms/exercise-engines/registry";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";
import { estimateBlockSeconds, estimateExerciseSeconds } from "@/modules/lessons/utils/learning-duration";
import styles from "./CmsLessonStepPlayer.module.css";

type JsonRecord = Record<string, unknown>;
type StepKind = "gap" | "builder" | "choice" | "matching";

type Exercise = {
  id: string;
  type: string;
  engineKey: string;
  variantKey: string | null;
  instruction: string;
  question: string;
  content: unknown;
  correctAnswer: unknown;
  alternativeAnswers: unknown;
  explanation: string | null;
  hint: string | null;
  hintsEnabled: boolean;
  difficulty: number;
  basePoints: number;
  timeLimitSeconds: number | null;
  solutionCost: number;
  allowInstantCheck: boolean;
  allowExtraExercise: boolean;
};

export type CmsLessonStepBlock = {
  id: string;
  type: string;
  title: string | null;
  content: unknown;
  settings: unknown;
  isRequired: boolean;
  order: number;
  exercises: Exercise[];
};

type Theory = {
  visible: boolean;
  text: string;
  audioUrl: string;
  imageUrl: string;
  videoUrl: string;
};

type Draft = {
  id?: string;
  blockId?: string;
  engineKey: ExerciseEngineKey;
  kind: StepKind;
  theory: Theory;
  source: string;
  instruction: string;
  options: string;
  correctAnswer: string;
  matchingPairs: string;
  duration: "auto" | "20" | "35" | "45" | "60" | "90";
};

type ContentBlockType =
  | "INTRO"
  | "LEARNING_OBJECTIVES"
  | "WARM_UP"
  | "THEORY"
  | "GRAMMAR"
  | "VOCABULARY"
  | "READING"
  | "LISTENING"
  | "VIDEO"
  | "IMAGE"
  | "DIALOGUE"
  | "REVIEW"
  | "HOMEWORK"
  | "QUOTE"
  | "PHRASE_OF_THE_DAY"
  | "NEXT_LESSON_PREVIEW"
  | "BREAK"
  | "DISCUSSION";

const EMPTY_THEORY: Theory = { visible: true, text: "", audioUrl: "", imageUrl: "", videoUrl: "" };

const CONTENT_BLOCK_OPTIONS: Array<{ type: ContentBlockType; title: string; description: string }> = [
  { type: "INTRO", title: "Lesson goal", description: "A short opening or target for the learner." },
  { type: "THEORY", title: "Theory", description: "A rich explanation, rule or worked example." },
  { type: "GRAMMAR", title: "Grammar note", description: "A focused grammar rule or reminder." },
  { type: "VOCABULARY", title: "Vocabulary", description: "Words, phrases or a small lexical set." },
  { type: "WARM_UP", title: "Warm-up", description: "A light prompt before the core activity." },
  { type: "READING", title: "Reading", description: "A reading passage or guided note." },
  { type: "LISTENING", title: "Listening", description: "Text with an optional audio URL." },
  { type: "VIDEO", title: "Video", description: "An embedded learning-video reference." },
  { type: "IMAGE", title: "Image", description: "An illustration or visual prompt." },
  { type: "DIALOGUE", title: "Dialogue", description: "A model conversation or role-play prompt." },
  { type: "REVIEW", title: "Review", description: "A recap before the learner moves on." },
  { type: "HOMEWORK", title: "Homework", description: "An assignment to complete outside the lesson." },
  { type: "QUOTE", title: "Quote", description: "A highlighted example, quote or usage note." },
  { type: "PHRASE_OF_THE_DAY", title: "Phrase of the day", description: "One useful phrase with context." },
  { type: "NEXT_LESSON_PREVIEW", title: "Next lesson", description: "A short preview of what comes next." },
  { type: "BREAK", title: "Break", description: "A deliberate pause or reflection prompt." },
  { type: "DISCUSSION", title: "Discussion", description: "A speaking or written reflection prompt." },
  { type: "LEARNING_OBJECTIVES", title: "Objectives", description: "A concise list of learning outcomes." },
];

const kindMeta: Record<StepKind, { title: string; description: string }> = {
  gap: { title: "Written response", description: "Ask for a short, checked language response." },
  builder: { title: "Sentence builder", description: "Learners arrange words into the final sentence." },
  choice: { title: "Choice task", description: "Offer options and define the accepted answer." },
  matching: { title: "Matching task", description: "Connect each prompt to its matching answer." },
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as JsonRecord) } : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getTheory(content: unknown): Theory {
  const source = record(record(content).authoringContext);
  return {
    visible: source.visible !== false,
    text: text(source.text),
    audioUrl: text(source.audioUrl),
    imageUrl: text(source.imageUrl),
    videoUrl: text(source.videoUrl),
  };
}

function kindForEngine(engineKey: ExerciseEngineKey): StepKind {
  const renderer = getExerciseEngine(engineKey)?.renderer;
  if (renderer === "matching" || renderer === "classification") return "matching";
  if (renderer === "ordering" || renderer === "word-bank") return "builder";
  if (renderer === "choice" || renderer === "audio-choice" || renderer === "hotspot") return "choice";
  return "gap";
}

function engineKeyFrom(exercise: Exercise): ExerciseEngineKey {
  return normalizeExerciseEngineKey(exercise.engineKey) ?? "fill-in-the-blanks";
}

function storedDuration(content: unknown): Draft["duration"] {
  const value = record(content).authoringDurationSeconds;
  return typeof value === "number" && [20, 35, 45, 60, 90].includes(value)
    ? String(value) as Draft["duration"]
    : "auto";
}

function defaultDraft(theory: Theory = EMPTY_THEORY, engineKey: ExerciseEngineKey = "fill-in-the-blanks"): Draft {
  return {
    engineKey,
    kind: kindForEngine(engineKey),
    theory,
    source: "",
    instruction: "Complete the task.",
    options: "",
    correctAnswer: "",
    matchingPairs: "",
    duration: "auto",
  };
}

function draftFrom(exercise: Exercise, blockId: string): Draft {
  const content = record(exercise.content);
  const engineKey = engineKeyFrom(exercise);
  const correct = typeof exercise.correctAnswer === "string"
    ? exercise.correctAnswer
    : Array.isArray(exercise.correctAnswer)
      ? strings(exercise.correctAnswer).join("\n")
      : "";
  const pairs = Object.entries(record(exercise.correctAnswer)).map(([left, right]) => `${left} = ${String(right)}`).join("\n");
  return {
    id: exercise.id,
    blockId,
    engineKey,
    kind: kindForEngine(engineKey),
    theory: getTheory(content),
    source: text(content.authoringSource) || (engineKey === "sentence-builder" ? strings(content.options).join(" ") : exercise.question),
    instruction: exercise.instruction,
    options: strings(content.options).join("\n"),
    correctAnswer: correct,
    matchingPairs: pairs,
    duration: storedDuration(content),
  };
}

function durationExercise(draft: Draft) {
  const pairs = pairsFrom(draft.matchingPairs);
  const content: JsonRecord = {
    authoringSource: draft.source,
    ...(draft.duration === "auto" ? {} : { authoringDurationSeconds: Number(draft.duration) }),
  };
  if (draft.kind === "builder") content.options = draft.source.trim().split(/\s+/).filter(Boolean);
  if (draft.kind === "choice") content.options = lines(draft.options);
  if (draft.kind === "matching") {
    content.left = Object.keys(pairs);
    content.right = Object.values(pairs);
  }
  return {
    engineKey: draft.engineKey,
    instruction: draft.instruction,
    question: draft.source,
    content,
    correctAnswer: draft.kind === "matching" ? pairs : draft.correctAnswer,
    difficulty: 1,
  };
}

function estimatedSeconds(draft: Draft) {
  return estimateExerciseSeconds(durationExercise(draft));
}

function gapData(source: string) {
  const match = source.match(/\[([^\]\r\n]+)\]/);
  const answer = match?.[1]?.trim() ?? "";
  return { answer, learnerText: source.replace(/\[([^\]\r\n]+)\]/g, "____") };
}

function pairsFrom(value: string) {
  return Object.fromEntries(lines(value).flatMap((line) => {
    const [left, ...right] = line.split("=");
    const target = right.join("=").trim();
    return left?.trim() && target ? [[left.trim(), target]] : [];
  }));
}

function legacyTypeForEngine(engineKey: ExerciseEngineKey) {
  const renderer = getExerciseEngine(engineKey)?.renderer;
  if (engineKey === "multiple-choice") return "MULTIPLE_CHOICE";
  if (engineKey === "fill-in-the-blanks") return "FILL_IN_THE_BLANK";
  if (renderer === "matching" || renderer === "classification") return "MATCHING";
  if (renderer === "ordering") return "SENTENCE_ORDER";
  if (renderer === "word-bank") return "WORD_ORDER";
  if (engineKey === "find-and-correct") return "ERROR_CORRECTION";
  if (engineKey === "translation") return "SENTENCE_TRANSLATION";
  if (renderer === "choice" || renderer === "audio-choice" || renderer === "hotspot") return "SINGLE_CHOICE";
  return "TEXT_INPUT";
}

function payloadFor(draft: Draft) {
  const engine = getExerciseEngine(draft.engineKey);
  if (!engine) throw new Error("Choose a supported exercise engine.");

  const context = {
    visible: draft.theory.visible,
    text: draft.theory.text.trim(),
    audioUrl: draft.theory.audioUrl.trim(),
    imageUrl: draft.theory.imageUrl.trim(),
    videoUrl: draft.theory.videoUrl.trim(),
  };
  const content: JsonRecord = {
    authoringContext: context,
    authoringDurationSeconds: draft.duration === "auto" ? null : Number(draft.duration),
    authoringSource: draft.source.trim(),
  };
  const base = {
    type: legacyTypeForEngine(draft.engineKey),
    engineKey: draft.engineKey,
    variantKey: getDefaultExerciseSubtype(draft.engineKey) ?? undefined,
    instruction: draft.instruction.trim() || "Complete the task.",
    explanation: undefined,
    hint: undefined,
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 1,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };

  if (draft.kind === "gap") {
    const isGapFill = draft.engineKey === "fill-in-the-blanks";
    const parsed = gapData(draft.source);
    const answer = isGapFill ? parsed.answer : draft.correctAnswer.trim();
    const question = isGapFill ? parsed.learnerText : draft.source.trim();
    if (!question || !answer) {
      throw new Error(isGapFill
        ? "Put the correct answer in square brackets, for example: The learner [writes] an answer."
        : "Add a prompt and an accepted answer.");
    }
    return { ...base, question, content, correctAnswer: answer };
  }

  if (draft.kind === "builder") {
    const tokens = draft.source.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 2) throw new Error("Enter a sentence with at least two words.");
    return {
      ...base,
      question: "Build the sentence.",
      content: { ...content, options: tokens, preserveOrder: true },
      correctAnswer: tokens,
    };
  }

  if (draft.kind === "choice") {
    const options = lines(draft.options);
    const expected = draft.engineKey === "multiple-choice" ? lines(draft.correctAnswer) : [draft.correctAnswer.trim()].filter(Boolean);
    if (options.length < 2 || !expected.length) throw new Error("Add at least two options and choose the correct answer.");
    if (expected.some((answer) => !options.includes(answer))) throw new Error("Every correct answer must match one of the options.");
    return {
      ...base,
      question: draft.source.trim() || "Choose the best answer.",
      content: { ...content, options },
      correctAnswer: draft.engineKey === "multiple-choice" ? expected : expected[0],
    };
  }

  const pairs = pairsFrom(draft.matchingPairs);
  const left = Object.keys(pairs);
  const right = Array.from(new Set(Object.values(pairs)));
  if (!left.length || !right.length) throw new Error("Add pairs in the format: word = translation.");
  return {
    ...base,
    question: draft.source.trim() || "Match the pairs.",
    content: { ...content, left, right },
    correctAnswer: pairs,
  };
}

async function api<T>(url: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null) as { data?: T; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to save the lesson step.");
  return payload.data;
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const lastEmittedValueRef = useRef<string | null>(null);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(true);
  const normalizedValue = sanitizeLessonRichText(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastEmittedValueRef.current === normalizedValue) return;
    // Do not reset innerHTML after the editor itself has emitted a change.
    // Browsers represent Enter as a new paragraph/div; sanitising that markup
    // during a React render used to overwrite the live DOM and move the caret.
    // Only a genuinely external value change may replace its contents.
    if (editor.innerHTML !== normalizedValue) editor.innerHTML = normalizedValue;
    lastEmittedValueRef.current = normalizedValue;
  }, [normalizedValue]);

  function emitValue() {
    const next = sanitizeLessonRichText(editorRef.current?.innerHTML ?? "");
    lastEmittedValueRef.current = next;
    onChange(next);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function currentEditorSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  function restoreSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selectionRef.current) return;
    if (!editor.contains(selectionRef.current.startContainer) || !editor.contains(selectionRef.current.endContainer)) {
      selectionRef.current = null;
      return;
    }
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function apply(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    // A selection made immediately before pressing a toolbar button wins over
    // any older remembered range. This makes Bold a true on/off action.
    const activeRange = currentEditorSelection();
    editor.focus({ preventScroll: true });
    if (activeRange) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(activeRange);
    } else restoreSelection();
    document.execCommand(command, false, commandValue);
    rememberSelection();
    emitValue();
  }

  function applyLink() {
    const href = window.prompt("Paste a link (https://, http://, mailto: or a site path):")?.trim();
    if (href) apply("createLink", href);
  }

  return <div className={styles.richTextShell}>
    <div className={`${styles.richTextToolbar} ${isToolbarCollapsed ? styles.richTextToolbarCollapsed : ""}`} role="toolbar" aria-label="Theory formatting">
      <div className={styles.richTextPrimaryTools}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("undo")} aria-label="Undo" title="Undo">↶</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("redo")} aria-label="Redo" title="Redo">↷</button>
        <span aria-hidden="true" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("bold")} aria-label="Bold text"><strong>B</strong></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("italic")} aria-label="Italic text"><em>I</em></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("underline")} aria-label="Underline text"><u>U</u></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("strikeThrough")} aria-label="Strikethrough text" title="Strikethrough"><s>S</s></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("subscript")} aria-label="Subscript" title="Subscript">X₂</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("superscript")} aria-label="Superscript" title="Superscript">X²</button>
        <span aria-hidden="true" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "h1")} aria-label="Large heading" title="Heading 1">H1</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "h2")} aria-label="Medium heading" title="Heading 2">H2</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "h3")} aria-label="Section heading" title="Heading 3">H3</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "p")} aria-label="Normal paragraph" title="Paragraph">¶</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("insertUnorderedList")} aria-label="Bulleted list">• List</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("insertOrderedList")} aria-label="Numbered list">1. List</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "blockquote")} aria-label="Quote">Quote</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("insertHorizontalRule")} aria-label="Divider" title="Divider">—</button>
        <span aria-hidden="true" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("justifyLeft")} aria-label="Align left" title="Align left">≡</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("justifyCenter")} aria-label="Align centre" title="Align centre">≡</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("justifyRight")} aria-label="Align right" title="Align right">≡</button>
      </div>
      <div className={styles.richTextAdvancedTools}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("indent")} aria-label="Increase indent" title="Increase indent">⇥</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("outdent")} aria-label="Decrease indent" title="Decrease indent">⇤</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={applyLink} aria-label="Add link" title="Add link">↗</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("unlink")} aria-label="Remove link" title="Remove link">⌁</button>
        <span aria-hidden="true" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#5148db")} aria-label="Purple text" title="Purple text"><span style={{ color: "#5148db" }}>●</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#0369a1")} aria-label="Blue text" title="Blue text"><span style={{ color: "#0369a1" }}>●</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#047857")} aria-label="Green text" title="Green text"><span style={{ color: "#047857" }}>●</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#c2410c")} aria-label="Orange text" title="Orange text"><span style={{ color: "#c2410c" }}>●</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#be123c")} aria-label="Red text" title="Red text"><span style={{ color: "#be123c" }}>●</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("backColor", "#eeecff")} aria-label="Purple highlight" title="Purple highlight">▰</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("backColor", "#e8f8ef")} aria-label="Green highlight" title="Green highlight">▰</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("backColor", "#fff0f2")} aria-label="Red highlight" title="Red highlight">▰</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("backColor", "#fff3d2")} aria-label="Amber highlight" title="Amber highlight">▰</button>
        <label className={styles.richTextColorControl} title="Choose text colour"><span>Text</span><input type="color" aria-label="Choose text colour" defaultValue="#5148db" onMouseDown={rememberSelection} onChange={(event) => apply("foreColor", event.currentTarget.value)} /></label>
        <label className={styles.richTextColorControl} title="Choose highlight colour"><span>Fill</span><input type="color" aria-label="Choose highlight colour" defaultValue="#fff3d2" onMouseDown={rememberSelection} onChange={(event) => apply("backColor", event.currentTarget.value)} /></label>
        <select aria-label="Font family" defaultValue="" onMouseDown={rememberSelection} onChange={(event) => { if (event.currentTarget.value) apply("fontName", event.currentTarget.value); event.currentTarget.value = ""; }}>
          <option value="">Font</option><option value="Inter, Arial, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Trebuchet MS, Arial, sans-serif">Trebuchet</option><option value="Courier New, monospace">Monospace</option>
        </select>
        <select aria-label="Text size" defaultValue="" onChange={(event) => { if (event.currentTarget.value) apply("fontSize", event.currentTarget.value); event.currentTarget.value = ""; }}>
          <option value="">Size</option><option value="1">Tiny</option><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Extra large</option><option value="6">Display</option><option value="7">Hero</option>
        </select>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("removeFormat")} aria-label="Clear formatting">Clear</button>
      </div>
      <button
        type="button"
        className={styles.richTextCollapseToggle}
        onClick={() => setIsToolbarCollapsed((collapsed) => !collapsed)}
        aria-label={isToolbarCollapsed ? "Expand formatting tools" : "Collapse formatting tools"}
        aria-expanded={!isToolbarCollapsed}
        title={isToolbarCollapsed ? "Show formatting tools" : "Hide formatting tools"}
      >
        {isToolbarCollapsed ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
      </button>
    </div>
    <div
      ref={editorRef}
      role="textbox"
      aria-multiline="true"
      aria-label="Theory text"
      contentEditable
      suppressContentEditableWarning
      onInput={emitValue}
      onFocus={rememberSelection}
      onKeyUp={rememberSelection}
      onMouseUp={rememberSelection}
      onMouseDown={() => { selectionRef.current = null; }}
      onSelect={rememberSelection}
      onBlur={rememberSelection}
      onPaste={(event) => {
        event.preventDefault();
        const pastedHtml = event.clipboardData.getData("text/html");
        const pastedText = event.clipboardData.getData("text/plain");
        const safeHtml = pastedHtml ? sanitizeLessonRichText(pastedHtml) : "";
        if (safeHtml) document.execCommand("insertHTML", false, safeHtml);
        else document.execCommand("insertText", false, pastedText);
        rememberSelection();
        emitValue();
      }}
      data-placeholder="Add a short rule, an example or a helpful note for this task."
      className={styles.richTextEditor}
    />
  </div>;
}

function blockBody(content: unknown) {
  if (typeof content === "string") return content;
  const source = record(content);
  return text(source.text) || text(source.body) || text(source.description) || text(source.content);
}

function blockMediaUrl(content: unknown) {
  const source = record(content);
  return text(source.url) || text(source.src);
}

function blockMediaDuration(content: unknown) {
  const value = record(content).durationSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? String(Math.round(value)) : "";
}

/**
 * A block can carry a concise learner-facing goal without mixing it into the
 * theory text. It lives in settings so existing rich content and translated
 * block bodies remain untouched.
 */
function lessonGoalFromSettings(settings: unknown) {
  return text(record(settings).lessonGoal).trim();
}

function settingsWithLessonGoal(settingsText: string, lessonGoal: string) {
  const parsed = settingsText.trim() ? JSON.parse(settingsText) : {};
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    if (lessonGoal.trim()) {
      throw new Error("Advanced settings must be a JSON object when a lesson goal is set.");
    }
    return parsed;
  }

  const next = { ...(parsed as JsonRecord) };
  if (lessonGoal.trim()) next.lessonGoal = lessonGoal.trim();
  else delete next.lessonGoal;
  return Object.keys(next).length ? next : null;
}

function updatedBlockContent(original: unknown, body: string, mediaUrl: string, mediaDuration = "") {
  const content = record(original);
  for (const key of ["text", "body", "description", "content"]) {
    if (typeof content[key] === "string") delete content[key];
  }
  if (body.trim()) content.text = body.trim();
  const duration = Number(mediaDuration);
  if (mediaUrl.trim()) {
    content.url = mediaUrl.trim();
    if (Number.isFinite(duration) && duration > 0) content.durationSeconds = Math.round(duration);
    else delete content.durationSeconds;
  }
  else {
    delete content.url;
    delete content.src;
    delete content.durationSeconds;
  }
  return Object.keys(content).length ? content : null;
}

function usesMediaUrl(type: string) {
  return ["VIDEO", "IMAGE", "LISTENING"].includes(type);
}

function ContentBlockDialog({
  open,
  initialType,
  lessonId,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialType?: ContentBlockType;
  lessonId: string;
  onClose: () => void;
  onCreated: (type: ContentBlockType) => void;
}) {
  const [type, setType] = useState<ContentBlockType>("THEORY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaDuration, setMediaDuration] = useState("");
  const [lessonGoal, setLessonGoal] = useState("");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = CONTENT_BLOCK_OPTIONS.find((option) => option.type === type) ?? CONTENT_BLOCK_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    setType(initialType ?? "THEORY");
    setTitle("");
    setBody("");
    setMediaUrl("");
    setMediaDuration("");
    setLessonGoal("");
    setRequired(false);
    setError(null);
  }, [initialType, open]);

  function create() {
    startTransition(async () => {
      try {
        await api(`/api/admin/lessons/${lessonId}/blocks`, "POST", {
          type,
          title: title.trim() || selected.title,
          content: updatedBlockContent(null, body, mediaUrl, mediaDuration) ?? undefined,
          settings: lessonGoal.trim() ? { lessonGoal: lessonGoal.trim() } : undefined,
          isRequired: required,
        });
        onCreated(type);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to create the content block.");
      }
    });
  }

  return <AppModal
    open={open}
    onOpenChange={(next) => { if (!next) onClose(); }}
    title="Add content block"
    description="Choose a learner-facing block, then add its title and styled content. You can refine it later from the lesson timeline."
    size="large"
    footer={<><button type="button" onClick={onClose} disabled={isPending} className={styles.secondaryButton}>Cancel</button><button type="button" onClick={create} disabled={isPending} className={styles.primaryButton}>{isPending ? "Adding…" : "Add block"}</button></>}
  >
    <div className={styles.blockDialogFields}>
      <div className={styles.blockTypeGrid} role="list" aria-label="Content block type">
        {CONTENT_BLOCK_OPTIONS.map((option) => <button
          key={option.type}
          type="button"
          onClick={() => setType(option.type)}
          className={`${styles.blockTypeCard} ${option.type === type ? styles.blockTypeCardActive : ""}`}
          role="listitem"
        >
          <strong>{option.title}</strong><span>{option.description}</span>
        </button>)}
      </div>
      <label className={styles.fieldLabel}>Block title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={selected.title} className={styles.field} /></label>
      <label className={styles.lessonGoalField}><input value={lessonGoal} onChange={(event) => setLessonGoal(event.target.value)} maxLength={240} aria-label="Lesson goal shown to the learner" placeholder="Lesson goal shown to the learner" className={`${styles.field} ${styles.lessonGoalInput}`} /></label>
      <RichTextEditor value={body} onChange={setBody} />
      {usesMediaUrl(type) ? <div className={styles.mediaFields}><label className={styles.fieldLabel}>{type === "IMAGE" ? "Image" : type === "VIDEO" ? "Video" : "Audio"} URL<input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} type="url" placeholder="https://…" className={styles.field} /></label>{type !== "IMAGE" ? <label className={styles.fieldLabel}>Duration, seconds<input value={mediaDuration} onChange={(event) => setMediaDuration(event.target.value)} type="number" min="1" max="7200" inputMode="numeric" placeholder="Auto" className={styles.field} /></label> : null}</div> : null}
      {error ? <p role="alert" className={styles.dialogError}>{error}</p> : null}
    </div>
  </AppModal>;
}

function TaskEditor({ draft, onChange, onChangeEngine, onEditBlock, onRemoveBlock, taskOptions = [], onSelectTask, isBusy = false }: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onChangeEngine: () => void;
  onEditBlock?: () => void;
  onRemoveBlock?: () => void;
  taskOptions?: Array<{ id: string; label: string }>;
  onSelectTask?: (exerciseId: string) => void;
  isBusy?: boolean;
}) {
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => onChange({ ...draft, [key]: value });
  const engine = getExerciseEngine(draft.engineKey);
  const isGapFill = draft.engineKey === "fill-in-the-blanks";
  const multiple = draft.engineKey === "multiple-choice";

  return <section className={styles.taskCard}>
    <div className={styles.cardHeading}>
      <div>
        <p className={styles.eyebrow}>Learner task</p>
        <h2>{engine?.title ?? kindMeta[draft.kind].title}</h2>
      </div>
      <div className={styles.taskCardActions}>
        {draft.blockId ? <button type="button" onClick={onEditBlock} className={styles.tertiaryButton}>Block settings</button> : null}
        {draft.blockId && onRemoveBlock ? <button type="button" onClick={onRemoveBlock} disabled={isBusy} className={styles.dangerButton}>Remove task block</button> : null}
        <button type="button" onClick={onChangeEngine} className={styles.tertiaryButton}>Change engine</button>
      </div>
    </div>
    <p className={styles.taskDescription}>{engine?.description ?? kindMeta[draft.kind].description}</p>
    <div className={styles.formGrid}>
      {draft.id && taskOptions.length > 1 && onSelectTask ? <label className={`${styles.fieldLabel} ${styles.taskJump}`}>Task in this block<select value={draft.id} onChange={(event) => onSelectTask(event.currentTarget.value)} className={styles.field}>{taskOptions.map((task) => <option key={task.id} value={task.id}>{task.label}</option>)}</select></label> : null}
      <label className={styles.fieldLabel}>Instruction<input value={draft.instruction} onChange={(event) => set("instruction", event.target.value)} className={styles.field} /></label>
      {draft.kind === "gap" ? <>
        <label className={styles.fieldLabel}>{isGapFill ? "Sentence with the correct answer in square brackets" : "Task prompt"}<textarea value={draft.source} onChange={(event) => set("source", event.target.value)} placeholder={isGapFill ? "The learner [writes] an answer." : "Write a language prompt for the learner."} className={`${styles.field} ${styles.compactArea}`} /></label>
        {!isGapFill ? <label className={styles.fieldLabel}>Accepted answer<input value={draft.correctAnswer} onChange={(event) => set("correctAnswer", event.target.value)} placeholder="Expected answer" className={styles.field} /></label> : null}
      </> : null}
      {draft.kind === "builder" ? <label className={styles.fieldLabel}>Final sentence<textarea value={draft.source} onChange={(event) => set("source", event.target.value)} placeholder="Write the sentence learners should build." className={`${styles.field} ${styles.compactArea}`} /></label> : null}
      {draft.kind === "choice" ? <>
        <label className={styles.fieldLabel}>Question<textarea value={draft.source} onChange={(event) => set("source", event.target.value)} placeholder="Write the question learners should answer." className={`${styles.field} ${styles.compactArea}`} /></label>
        <div className={styles.splitFields}>
          <label className={styles.fieldLabel}>Options — one per line<textarea value={draft.options} onChange={(event) => set("options", event.target.value)} placeholder={'Option one\nOption two\nOption three'} className={`${styles.field} ${styles.compactArea}`} /></label>
          <label className={styles.fieldLabel}>Correct option{multiple ? "s — one per line" : ""}<textarea value={draft.correctAnswer} onChange={(event) => set("correctAnswer", event.target.value)} placeholder={multiple ? "Option one\nOption two" : "Option one"} className={`${styles.field} ${styles.compactArea}`} /></label>
        </div>
      </> : null}
      {draft.kind === "matching" ? <>
        <label className={styles.fieldLabel}>Task prompt<input value={draft.source} onChange={(event) => set("source", event.target.value)} placeholder="Match each phrase to its meaning." className={styles.field} /></label>
        <label className={styles.fieldLabel}>Pairs — one per line, left = right<textarea value={draft.matchingPairs} onChange={(event) => set("matchingPairs", event.target.value)} placeholder={'hello = hi\ngoodbye = see you'} className={`${styles.field} ${styles.compactArea}`} /></label>
      </> : null}
      <label className={`${styles.fieldLabel} ${styles.durationField}`}>Step time<select value={draft.duration} onChange={(event) => set("duration", event.target.value as Draft["duration"])} className={styles.field}><option value="auto">Automatic — based on content</option><option value="20">20 sec</option><option value="35">35 sec</option><option value="45">45 sec</option><option value="60">1 min</option><option value="90">1.5 min</option></select></label>
    </div>
  </section>;
}

function TaskAuthoringPanel({
  open,
  choosingEngine,
  draft,
  onChange,
  onChooseEngine,
  onChangeEngine,
  onEditBlock,
  onRemoveBlock,
  taskOptions,
  onSelectTask,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean;
  choosingEngine: boolean;
  draft: Draft;
  onChange: (next: Draft) => void;
  onChooseEngine: (engineKey: ExerciseEngineKey) => void;
  onChangeEngine: () => void;
  onEditBlock: () => void;
  onRemoveBlock: () => void;
  taskOptions: Array<{ id: string; label: string }>;
  onSelectTask: (exerciseId: string) => void;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
}) {
  const engine = getExerciseEngine(draft.engineKey);
  return <AppModal
    open={open}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}
    title={choosingEngine ? "Add a task" : undefined}
    description={choosingEngine
      ? "Choose the learning interaction you want to add to this lesson step."
      : undefined}
    headerContent={!choosingEngine ? <div className={`${styles.field} ${styles.blockTitleHeaderInput}`}>{engine?.title ?? "Task authoring"}</div> : undefined}
    size={choosingEngine ? "fullscreen" : "large"}
    tall={!choosingEngine}
    compactHeader={!choosingEngine}
    headerClassName={!choosingEngine ? styles.blockEditorModalHeader : undefined}
    bodyClassName={!choosingEngine ? styles.taskEditorModalBody : undefined}
    loading={isPending}
    ariaLabel="Task authoring"
    footer={!choosingEngine ? <div className={styles.taskModalFooter}>
      <p>Configure the task, then save it as the next lesson step.</p>
      <button type="button" disabled={isPending} onClick={onSave} className={styles.primaryButton}>{isPending ? "Saving…" : "Save task & next →"}</button>
    </div> : undefined}
  >
      {choosingEngine ? <>
        <p className={styles.taskModalIntro}>Every option opens the same learner-facing task editor, so you can enter your own language content and test the result before publishing.</p>
        <div className={styles.engineGrid}>
          {EXERCISE_ENGINES.map((engineOption) => <button
            key={engineOption.key}
            type="button"
            onClick={() => onChooseEngine(engineOption.key)}
            className={styles.engineCard}
          >
            <span className={styles.engineCode}>{engineOption.engine.replace(/_/g, " ")}</span>
            <strong>{engineOption.title}</strong>
            <span>{engineOption.description}</span>
          </button>)}
        </div>
      </> : <>
        <TaskEditor draft={draft} onChange={onChange} onChangeEngine={onChangeEngine} onEditBlock={onEditBlock} onRemoveBlock={onRemoveBlock} taskOptions={taskOptions} onSelectTask={onSelectTask} isBusy={isPending} />
      </>}
  </AppModal>;
}

function stringifyJson(value: unknown) {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

type BlockUpdatePayload = {
  title?: string;
  content: unknown;
  settings: unknown;
  isRequired: boolean;
};

function makeBlockUpdatePayload(block: CmsLessonStepBlock, values: {
  title: string;
  body: string;
  mediaUrl: string;
  mediaDuration: string;
  settings: string;
  lessonGoal: string;
  required: boolean;
}): BlockUpdatePayload {
  return {
    title: values.title.trim() || undefined,
    content: updatedBlockContent(block.content, values.body, values.mediaUrl, values.mediaDuration),
    settings: settingsWithLessonGoal(values.settings, values.lessonGoal),
    isRequired: values.required,
  };
}

function BlockEditorDialog({
  block,
  onClose,
  onRemoved,
}: {
  block: CmsLessonStepBlock | null;
  onClose: () => void;
  onRemoved: (action: "DELETED" | "ARCHIVED") => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(block?.title ?? "");
  const [body, setBody] = useState(blockBody(block?.content));
  const [mediaUrl, setMediaUrl] = useState(blockMediaUrl(block?.content));
  const [mediaDuration, setMediaDuration] = useState(blockMediaDuration(block?.content));
  const [settings, setSettings] = useState(stringifyJson(block?.settings));
  const [lessonGoal, setLessonGoal] = useState(lessonGoalFromSettings(block?.settings));
  const [required, setRequired] = useState(block?.isRequired ?? false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "paused">("idle");
  const [loadedBlockId, setLoadedBlockId] = useState(block?.id ?? null);
  const [autoSaveCycle, setAutoSaveCycle] = useState(0);
  const lastSavedPayloadRef = useRef<string | null>(null);
  const autoSaveBusyRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const nextTitle = block?.title ?? "";
    const nextBody = blockBody(block?.content);
    const nextMediaUrl = blockMediaUrl(block?.content);
    const nextMediaDuration = blockMediaDuration(block?.content);
    const nextSettings = stringifyJson(block?.settings);
    const nextLessonGoal = lessonGoalFromSettings(block?.settings);
    const nextRequired = block?.isRequired ?? false;
    setTitle(nextTitle);
    setBody(nextBody);
    setMediaUrl(nextMediaUrl);
    setMediaDuration(nextMediaDuration);
    setSettings(nextSettings);
    setLessonGoal(nextLessonGoal);
    setRequired(nextRequired);
    setConfirmRemoval(false);
    setError(null);
    setAutoSaveState("idle");
    setLoadedBlockId(block?.id ?? null);
    autoSaveBusyRef.current = false;
    try {
      lastSavedPayloadRef.current = block
        ? JSON.stringify(makeBlockUpdatePayload(block, {
          title: nextTitle,
          body: nextBody,
          mediaUrl: nextMediaUrl,
          mediaDuration: nextMediaDuration,
          settings: nextSettings,
          lessonGoal: nextLessonGoal,
          required: nextRequired,
        }))
        : null;
    } catch {
      lastSavedPayloadRef.current = null;
    }
  }, [block]);

  const currentPayload = useMemo(() => {
    if (!block) return null;
    try {
      return makeBlockUpdatePayload(block, { title, body, mediaUrl, mediaDuration, settings, lessonGoal, required });
    } catch {
      return null;
    }
  }, [block, body, lessonGoal, mediaDuration, mediaUrl, required, settings, title]);
  const currentPayloadKey = currentPayload ? JSON.stringify(currentPayload) : null;

  useEffect(() => {
    if (!block || loadedBlockId !== block.id || confirmRemoval) return;
    if (!currentPayload || !currentPayloadKey) {
      if (settings.trim()) setAutoSaveState("paused");
      return;
    }
    if (lastSavedPayloadRef.current === currentPayloadKey || autoSaveBusyRef.current) return;

    setAutoSaveState("idle");
    const timer = window.setTimeout(() => {
      autoSaveBusyRef.current = true;
      setAutoSaveState("saving");
      void api(`/api/admin/blocks/${block.id}`, "PATCH", currentPayload)
        .then(() => {
          lastSavedPayloadRef.current = currentPayloadKey;
          setError(null);
          setAutoSaveState("saved");
        })
        .catch((reason) => {
          setAutoSaveState("paused");
          setError(reason instanceof Error ? reason.message : "Auto-save could not save this lesson block.");
        })
        .finally(() => {
          autoSaveBusyRef.current = false;
          setAutoSaveCycle((value) => value + 1);
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [autoSaveCycle, block, confirmRemoval, currentPayload, currentPayloadKey, loadedBlockId, settings]);

  function closeEditor() {
    router.refresh();
    onClose();
  }

  function save() {
    if (!block || !currentPayload || !currentPayloadKey) {
      setAutoSaveState("paused");
      setError("Check the advanced settings JSON before saving this lesson block.");
      return;
    }
    startTransition(async () => {
      try {
        await api(`/api/admin/blocks/${block.id}`, "PATCH", currentPayload);
        lastSavedPayloadRef.current = currentPayloadKey;
        setAutoSaveState("saved");
        router.refresh();
        onClose();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to save this lesson block.");
      }
    });
  }

  function remove() {
    if (!block) return;
    startTransition(async () => {
      try {
        const result = await api<{ action: "DELETED" | "ARCHIVED" }>(`/api/admin/blocks/${block.id}`, "DELETE");
        router.refresh();
        onClose();
        onRemoved(result.action);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to remove this lesson block.");
      }
    });
  }

  const footer = confirmRemoval
    ? <><button type="button" onClick={() => setConfirmRemoval(false)} disabled={isPending} className={styles.secondaryButton}>Keep block</button><button type="button" onClick={remove} disabled={isPending} className={styles.dangerButton}>{isPending ? "Removing…" : "Remove block"}</button></>
    : <><button type="button" onClick={() => setConfirmRemoval(true)} disabled={isPending || autoSaveState === "saving"} className={styles.dangerButton}>Remove block</button><span className={styles.footerSpacer} /><span aria-live="polite" data-state={autoSaveState} className={styles.autoSaveStatus}>{autoSaveState === "saving" ? "Saving…" : autoSaveState === "saved" ? "Saved" : autoSaveState === "paused" ? "Auto-save paused" : "Autosaves after a short pause"}</span><button type="button" onClick={closeEditor} disabled={isPending} className={styles.secondaryButton}>Cancel</button><button type="button" onClick={save} disabled={isPending || autoSaveState === "saving"} className={styles.primaryButton}>{isPending ? "Saving…" : "Save block"}</button></>;

  return <AppModal
    open={block !== null}
    onOpenChange={(open) => { if (!open) closeEditor(); }}
    headerContent={<input
      aria-label="Block title"
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      className={`${styles.field} ${styles.blockTitleHeaderInput}`}
    />}
    showCloseButton
    compactHeader
    headerClassName={styles.blockEditorModalHeader}
    bodyClassName={styles.blockEditorModalBody}
    tall
    ariaLabel="Block editor"
    size="large"
    footer={footer}
  >
    <div className={`${styles.blockDialogFields} ${styles.blockEditorFields}`}>
      <label className={styles.lessonGoalField}><input value={lessonGoal} onChange={(event) => setLessonGoal(event.target.value)} maxLength={240} aria-label="Lesson goal shown to the learner" placeholder="Lesson goal shown to the learner" className={`${styles.field} ${styles.lessonGoalInput}`} /></label>
      <RichTextEditor value={body} onChange={setBody} />
      {block && usesMediaUrl(block.type) ? <div className={styles.mediaFields}><label className={styles.fieldLabel}>{block.type === "IMAGE" ? "Image" : block.type === "VIDEO" ? "Video" : "Audio"} URL<input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} type="url" placeholder="https://…" className={styles.field} /></label>{block.type !== "IMAGE" ? <label className={styles.fieldLabel}>Duration, seconds<input value={mediaDuration} onChange={(event) => setMediaDuration(event.target.value)} type="number" min="1" max="7200" inputMode="numeric" placeholder="Auto" className={styles.field} /></label> : null}</div> : null}
      {confirmRemoval ? <p className={styles.removalNotice}>This removes the block from the lesson. If learners already have attempts, homework or saved mistakes, it is archived instead so their history remains intact.</p> : null}
      {error ? <p role="alert" className={styles.dialogError}>{error}</p> : null}
    </div>
  </AppModal>;
}

type TimelineItem = {
  id: string;
  label: string;
  kind: "exercise" | "block" | "draft";
  block?: CmsLessonStepBlock;
  exercise?: Exercise;
  seconds: number;
};

function timelineToneIndex(id: string) {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) value = ((value << 5) - value) + id.charCodeAt(index);
  return Math.abs(value) % 8;
}

function LessonTimeline({
  items,
  totalSeconds,
  activeId,
  onSelect,
  onAddTheory,
  onAddAudio,
  onAddVideo,
  onAddContentBlock,
  onAddTask,
  onNextStep,
  onReorder,
  isPending,
}: {
  items: TimelineItem[];
  totalSeconds: number;
  activeId: string;
  onSelect: (item: TimelineItem) => void;
  onAddTheory: () => void;
  onAddAudio: () => void;
  onAddVideo: () => void;
  onAddContentBlock: () => void;
  onAddTask: () => void;
  onNextStep: () => void;
  onReorder: (sourceBlockId: string, targetBlockId: string, position: "before" | "after") => void;
  isPending: boolean;
}) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("before");
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const phase = totalSeconds < 900 ? "short" : totalSeconds <= 1500 ? "ideal" : "long";
  const copy = phase === "short"
    ? `Current lesson length: ${minutes} min. Add more focused practice to reach a 15-minute session.`
    : phase === "ideal"
      ? `Estimated completion: ${minutes} min. This fits a focused learner session.`
      : `This lesson is about ${minutes} min. Consider moving later activities to the next lesson.`;
  return <section className={`${styles.timerCard} ${styles[phase]}`}>
    <div className={styles.timerHeading}><div><p className={styles.eyebrow}>Smart lesson timer</p><strong>~{minutes} min</strong></div></div>
    <div className={styles.timerCopy}><div className={styles.timerTrack}><span style={{ width: `${Math.min(100, Math.round((totalSeconds / 1500) * 100))}%` }} /></div><p>{copy}</p></div>
    <div className={styles.timelineActions} aria-label="Add a lesson block">
      <button type="button" onClick={onAddTheory} className={styles.secondaryButton}>+ Theory</button>
      <button type="button" onClick={onAddAudio} className={styles.secondaryButton}>+ Audio</button>
      <button type="button" onClick={onAddVideo} className={styles.secondaryButton}>+ Video</button>
      <button type="button" onClick={onAddContentBlock} className={styles.secondaryButton}>+ Content block</button>
      <button type="button" onClick={onAddTask} className={styles.primaryButton}>+ Add task</button>
      <button type="button" onClick={onNextStep} disabled={isPending} className={styles.secondaryButton}>{isPending ? "Creating…" : "Next step →"}</button>
    </div>
    <nav className={styles.timeline} aria-label="Lesson block timeline">
      {items.map((item, index) => {
        const blockId = item.kind === "block" ? item.block?.id : undefined;
        const draggable = Boolean(blockId) && !isPending;
        return <div
          key={item.id}
          role="button"
          tabIndex={0}
          draggable={draggable}
          onClick={() => onSelect(item)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(item);
            }
          }}
          onDragStart={(event) => {
            if (!blockId) return;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", blockId);
            setDraggedBlockId(blockId);
            setDropTargetBlockId(null);
            setDropPosition("before");
          }}
          onDragEnd={() => { setDraggedBlockId(null); setDropTargetBlockId(null); setDropPosition("before"); }}
          onDragOver={(event) => {
            if (draggable && blockId && draggedBlockId && draggedBlockId !== blockId) {
              event.preventDefault();
              setDropTargetBlockId(blockId);
              const bounds = event.currentTarget.getBoundingClientRect();
              setDropPosition(event.clientX >= bounds.left + (bounds.width / 2) ? "after" : "before");
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const sourceBlockId = draggedBlockId ?? event.dataTransfer.getData("text/plain");
            const bounds = event.currentTarget.getBoundingClientRect();
            const position = event.clientX >= bounds.left + (bounds.width / 2) ? "after" : "before";
            if (sourceBlockId && blockId && sourceBlockId !== blockId) onReorder(sourceBlockId, blockId, position);
            setDraggedBlockId(null);
            setDropTargetBlockId(null);
            setDropPosition("before");
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) {
              setDropTargetBlockId(null);
              setDropPosition("before");
            }
          }}
          data-tone={timelineToneIndex(item.id)}
          data-drop-target={dropTargetBlockId === blockId ? "true" : undefined}
          data-drop-position={dropTargetBlockId === blockId ? dropPosition : undefined}
          data-dragging={draggedBlockId === blockId || undefined}
          className={`${styles.timelineCard} ${(item.kind === "block" && item.block?.exercises.some((exercise) => exercise.id === activeId)) || (item.kind === "draft" && activeId === "new") ? styles.timelineCardActive : ""}`}
          aria-label={draggable ? `${item.label}. Drag to change this block's position.` : item.label}
          title={draggable ? "Drag this block to a new position" : undefined}
        >
          <span>{index + 1} · {item.seconds ? `~${item.seconds} sec` : "not estimated"}</span><strong>{item.label}</strong><em>{item.kind === "draft" ? "Draft" : item.block?.exercises.length ? `${item.block.type} · ${item.block.exercises.length} tasks` : item.block?.type}</em>
        </div>;
      })}
      {items.length === 0 ? <p className={styles.emptySteps}>No lesson blocks yet. Add theory, media or the first task above.</p> : null}
    </nav>
  </section>;
}

export function CmsLessonStepPlayer({ lessonId, blocks, onContentChanged }: { lessonId: string; blocks: CmsLessonStepBlock[]; onContentChanged?: () => void }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState("new");
  const [draft, setDraft] = useState<Draft>(() => defaultDraft());
  const [message, setMessage] = useState<string | null>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [enginePickerOpen, setEnginePickerOpen] = useState(false);
  const [editingNewTask, setEditingNewTask] = useState(false);
  const [hasPendingStep, setHasPendingStep] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<CmsLessonStepBlock | null>(null);
  const [contentBlockType, setContentBlockType] = useState<ContentBlockType | null>(null);
  const [isPending, startTransition] = useTransition();
  const [orderedBlockIds, setOrderedBlockIds] = useState(() => blocks.map((block) => block.id));
  const orderedBlocks = useMemo(() => {
    const byId = new Map(blocks.map((block) => [block.id, block]));
    const ordered = orderedBlockIds.map((id) => byId.get(id)).filter((block): block is CmsLessonStepBlock => Boolean(block));
    const orderedIds = new Set(ordered.map((block) => block.id));
    return [...ordered, ...blocks.filter((block) => !orderedIds.has(block.id))];
  }, [blocks, orderedBlockIds]);
  const blockIdsFromServer = blocks.map((block) => block.id).join(",");

  useEffect(() => {
    setOrderedBlockIds(blocks.map((block) => block.id));
  }, [blockIdsFromServer, blocks]);

  const steps = useMemo(() => orderedBlocks.filter((block) => block.type === "EXERCISE").flatMap((block) => block.exercises.map((exercise) => ({ exercise, blockId: block.id }))), [orderedBlocks]);
  const activeStep = steps.find((step) => step.exercise.id === activeId);
  const taskOptions = useMemo(() => {
    const taskBlock = orderedBlocks.find((block) => block.id === draft.blockId);
    return taskBlock?.exercises.map((exercise, index) => ({
      id: exercise.id,
      label: `Task ${index + 1} — ${exercise.question || "Untitled task"}`,
    })) ?? [];
  }, [draft.blockId, orderedBlocks]);
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const savedItems = orderedBlocks.map<TimelineItem>((block) => {
      // Every saved block remains visible and editable in the CMS, even when
      // it also owns exercises. A block and all of its tasks move as one unit,
      // so reordering cannot visually strand a task card elsewhere.
      return {
        id: `block-${block.id}`,
        label: block.title || block.type.replace(/_/g, " "),
        kind: "block",
        block,
        seconds: estimateBlockSeconds(block),
      };
    });
    if (!hasPendingStep) return savedItems;
    return [...savedItems, {
      id: "draft-next-step",
      label: "New lesson step",
      kind: "draft",
      seconds: editingNewTask ? estimatedSeconds(draft) : 0,
    }];
  }, [draft, editingNewTask, hasPendingStep, orderedBlocks]);
  const totalSeconds = timelineItems.reduce((total, item) => total + item.seconds, 0);

  useEffect(() => {
    if (activeId === "new") return;
    const next = steps.find((step) => step.exercise.id === activeId);
    if (next) setDraft(draftFrom(next.exercise, next.blockId));
  }, [activeId, orderedBlocks, steps]);

  function selectStep(id: string) {
    setMessage(null);
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
    setEditingNewTask(false);
    setActiveId(id);
  }

  function openExistingTask(exercise: Exercise, blockId: string) {
    setMessage(null);
    setDraft(draftFrom(exercise, blockId));
    setActiveId(exercise.id);
    setEditingNewTask(false);
    setEnginePickerOpen(false);
    setTaskPanelOpen(true);
  }

  function selectTaskInModal(id: string) {
    const step = steps.find((item) => item.exercise.id === id);
    if (step) openExistingTask(step.exercise, step.blockId);
  }

  function openTaskPicker(targetBlockId?: string) {
    setMessage(null);
    setActiveId("new");
    setDraft({ ...defaultDraft(draft.theory), ...(targetBlockId ? { blockId: targetBlockId } : {}) });
    setEditingNewTask(true);
    if (!targetBlockId) setHasPendingStep(true);
    setTaskPanelOpen(true);
    setEnginePickerOpen(true);
  }

  function openContentBlockCreator(type: ContentBlockType = "THEORY") {
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
    setContentBlockType(type);
  }

  function chooseEngine(engineKey: ExerciseEngineKey) {
    setDraft((current) => ({
      ...defaultDraft(current.theory, engineKey),
      id: current.id,
      blockId: current.blockId,
      duration: current.duration,
    }));
    setEnginePickerOpen(false);
  }

  function clearForNextStep() {
    const theory = draft.theory;
    setActiveId("new");
    setDraft(defaultDraft(theory));
    setEditingNewTask(false);
    setHasPendingStep(true);
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
  }

  async function createExerciseBlock() {
    return api<{ id: string }>(`/api/admin/lessons/${lessonId}/blocks`, "POST", { type: "EXERCISE", title: "Practice task", isRequired: true });
  }

  function createNextStep() {
    clearForNextStep();
    setMessage("A new draft step is ready. It will be saved only when its task is saved.");
  }

  function openDraftBlockSettings() {
    const block = draft.blockId ? blocks.find((item) => item.id === draft.blockId) : null;
    if (!block) return;
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
    setSelectedBlock(block);
  }

  function removeActiveTaskBlock() {
    const blockId = draft.blockId;
    if (!blockId) return;
    startTransition(async () => {
      try {
        const result = await api<{ action: "DELETED" | "ARCHIVED" }>(`/api/admin/blocks/${blockId}`, "DELETE");
        setActiveId("new");
        setDraft(defaultDraft());
        setEditingNewTask(false);
        setHasPendingStep(false);
        setTaskPanelOpen(false);
        setEnginePickerOpen(false);
        setMessage(result.action === "DELETED"
          ? "Task block removed from the lesson."
          : "Task block archived because learner history exists.");
        onContentChanged?.();
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to remove this task block.");
      }
    });
  }

  function closeTaskPanel() {
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
    if (activeId === "new") setEditingNewTask(false);
  }

  function selectTimelineItem(item: TimelineItem) {
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
    if (item.kind === "draft") {
      setMessage(null);
      openTaskPicker();
      return;
    }
    if (item.exercise) {
      openExistingTask(item.exercise, item.block?.id ?? "");
      return;
    }
    const block = item.block;
    if (!block) return;
    if (block.type === "EXERCISE") {
      setMessage(null);
      if (block.exercises.length > 0) {
        openExistingTask(block.exercises[0], block.id);
        return;
      }
      openTaskPicker(block.id);
      return;
    }
    setSelectedBlock(block);
  }

  function reorderLessonBlocks(sourceBlockId: string, targetBlockId: string, position: "before" | "after") {
    if (sourceBlockId === targetBlockId) return;
    const sourceIndex = orderedBlocks.findIndex((block) => block.id === sourceBlockId);
    const targetIndex = orderedBlocks.findIndex((block) => block.id === targetBlockId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const ordered = [...orderedBlocks];
    const [source] = ordered.splice(sourceIndex, 1);
    const updatedTargetIndex = ordered.findIndex((block) => block.id === targetBlockId);
    if (updatedTargetIndex < 0) return;
    ordered.splice(position === "after" ? updatedTargetIndex + 1 : updatedTargetIndex, 0, source);
    const nextOrderedIds = ordered.map((block) => block.id);
    setOrderedBlockIds(nextOrderedIds);

    startTransition(async () => {
      try {
        await api("/api/admin/cms/content/LESSON_BLOCK/reorder", "PUT", { orderedIds: nextOrderedIds });
        setMessage("Lesson block order saved.");
        onContentChanged?.();
        router.refresh();
      } catch (error) {
        setOrderedBlockIds(blocks.map((block) => block.id));
        setMessage(error instanceof Error ? error.message : "Unable to reorder lesson blocks.");
      }
    });
  }

  function saveAndNext() {
    startTransition(async () => {
      try {
        const payload = payloadFor(draft);
        let blockId = draft.blockId;
        if (!blockId) {
          const block = await createExerciseBlock();
          blockId = block.id;
        }
        if (draft.id) await api(`/api/admin/exercises/${draft.id}`, "PATCH", payload);
        else await api(`/api/admin/blocks/${blockId}/exercises`, "POST", payload);
        clearForNextStep();
        setMessage("Task saved. A fresh draft step is ready.");
        onContentChanged?.();
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save this task.");
      }
    });
  }

  return <section className={styles.player} aria-label="WYSIWYG lesson builder">
    <LessonTimeline
      items={timelineItems}
      totalSeconds={totalSeconds}
      activeId={activeId}
      onSelect={selectTimelineItem}
      onAddTheory={() => openContentBlockCreator("THEORY")}
      onAddAudio={() => openContentBlockCreator("LISTENING")}
      onAddVideo={() => openContentBlockCreator("VIDEO")}
      onAddContentBlock={() => openContentBlockCreator()}
      onAddTask={() => openTaskPicker()}
      onNextStep={createNextStep}
      onReorder={reorderLessonBlocks}
      isPending={isPending}
    />
    <div className={styles.workspace}>
      <TaskAuthoringPanel open={taskPanelOpen} choosingEngine={enginePickerOpen} draft={draft} onChange={setDraft} onChooseEngine={chooseEngine} onChangeEngine={() => setEnginePickerOpen(true)} onEditBlock={openDraftBlockSettings} onRemoveBlock={removeActiveTaskBlock} taskOptions={taskOptions} onSelectTask={selectTaskInModal} onClose={closeTaskPanel} onSave={saveAndNext} isPending={isPending} />
      <div className={styles.authorColumn}>
      <div className={styles.authorScroll}>
        {!taskPanelOpen && (activeId === "new" && !editingNewTask ? null : <TaskEditor draft={draft} onChange={setDraft} onChangeEngine={() => { setTaskPanelOpen(true); setEnginePickerOpen(true); }} onEditBlock={openDraftBlockSettings} onRemoveBlock={removeActiveTaskBlock} taskOptions={taskOptions} onSelectTask={selectStep} isBusy={isPending} />)}
        {!taskPanelOpen && (activeId !== "new" || editingNewTask) ? <div className={styles.saveBar}><p>{activeStep ? "Changes update this task." : "Configure the task, then save."}</p><button type="button" disabled={isPending} onClick={saveAndNext} className={styles.primaryButton}>{isPending ? "Saving…" : "Save task & next →"}</button></div> : null}
        {message ? <p role="status" className={styles.statusMessage}>{message}</p> : null}
      </div>
      </div>
    </div>
    <ContentBlockDialog
      open={contentBlockType !== null}
      initialType={contentBlockType ?? "THEORY"}
      lessonId={lessonId}
      onClose={() => setContentBlockType(null)}
      onCreated={(type) => {
        setContentBlockType(null);
        setMessage(`${type.replace(/_/g, " ")} block added. Select it on the timeline to continue editing.`);
        onContentChanged?.();
        router.refresh();
      }}
    />
    <BlockEditorDialog
      block={selectedBlock}
      onClose={() => setSelectedBlock(null)}
      onRemoved={(action) => setMessage(action === "DELETED" ? "Block removed from the lesson." : "Block archived because learner history exists.")}
    />
  </section>;
}
