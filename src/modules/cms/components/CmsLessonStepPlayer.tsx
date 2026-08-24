"use client";

/* eslint-disable @next/next/no-img-element -- CMS previews accept author-supplied media URLs. */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppModal } from "@/core/components/AppModal";
import {
  EXERCISE_ENGINES,
  getDefaultExerciseSubtype,
  getExerciseEngine,
  normalizeExerciseEngineKey,
  type ExerciseEngineKey,
} from "@/modules/cms/exercise-engines/registry";
import { sanitizeLessonRichText } from "@/modules/lessons/utils/rich-text";
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

function automaticWeight(engineKey: ExerciseEngineKey) {
  const renderer = getExerciseEngine(engineKey)?.renderer;
  if (renderer === "ordering" || renderer === "word-bank") return 45;
  if (renderer === "audio-choice" || renderer === "media" || renderer === "recording") return 60;
  if (renderer === "choice" || renderer === "hotspot") return 20;
  return 35;
}

function estimatedSeconds(draft: Draft) {
  return draft.duration === "auto" ? automaticWeight(draft.engineKey) : Number(draft.duration);
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

async function api<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null) as { data?: T; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to save the lesson step.");
  return payload.data;
}

function MediaDialog({
  kind,
  value,
  onSave,
  onClose,
}: {
  kind: "audio" | "video" | null;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(value);

  useEffect(() => setUrl(value), [value, kind]);

  const label = kind === "audio" ? "Audio" : "Video";
  return <AppModal
    open={kind !== null}
    onOpenChange={(open) => { if (!open) onClose(); }}
    title={`Add ${label.toLowerCase()}`}
    description={`Attach a hosted ${label.toLowerCase()} file to the theory shown above this task.`}
    size="medium"
    footer={<><button type="button" onClick={onClose} className={styles.secondaryButton}>Cancel</button><button type="button" onClick={() => { onSave(url.trim()); onClose(); }} className={styles.primaryButton}>Save {label.toLowerCase()}</button></>}
  >
    <label className={styles.fieldLabel}>
      {label} URL
      <input value={url} onChange={(event) => setUrl(event.target.value)} type="url" placeholder="https://…" className={styles.field} />
    </label>
    <p className={styles.fieldHint}>Use a direct, secure URL to the media file. You can replace or clear it later.</p>
  </AppModal>;
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const normalizedValue = sanitizeLessonRichText(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== normalizedValue) editor.innerHTML = normalizedValue;
  }, [normalizedValue]);

  function emitValue() {
    onChange(sanitizeLessonRichText(editorRef.current?.innerHTML ?? ""));
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function apply(command: string, commandValue?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    rememberSelection();
    emitValue();
  }

  return <div className={styles.richTextShell}>
    <div className={styles.richTextToolbar} role="toolbar" aria-label="Theory formatting">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("bold")} aria-label="Bold text"><strong>B</strong></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("italic")} aria-label="Italic text"><em>I</em></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("underline")} aria-label="Underline text"><u>U</u></button>
      <span aria-hidden="true" />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "h3")} aria-label="Section heading">H</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("insertUnorderedList")} aria-label="Bulleted list">• List</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("insertOrderedList")} aria-label="Numbered list">1. List</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("formatBlock", "blockquote")} aria-label="Quote">Quote</button>
      <span aria-hidden="true" />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#5148db")} aria-label="Purple text" title="Purple text"><span style={{ color: "#5148db" }}>●</span></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#0369a1")} aria-label="Blue text" title="Blue text"><span style={{ color: "#0369a1" }}>●</span></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#047857")} aria-label="Green text" title="Green text"><span style={{ color: "#047857" }}>●</span></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#c2410c")} aria-label="Orange text" title="Orange text"><span style={{ color: "#c2410c" }}>●</span></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("foreColor", "#be123c")} aria-label="Red text" title="Red text"><span style={{ color: "#be123c" }}>●</span></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply("removeFormat")} aria-label="Clear formatting">Clear</button>
    </div>
    <div
      ref={editorRef}
      role="textbox"
      aria-multiline="true"
      aria-label="Theory text"
      contentEditable
      suppressContentEditableWarning
      onInput={emitValue}
      onKeyUp={rememberSelection}
      onMouseUp={rememberSelection}
      onBlur={rememberSelection}
      onPaste={(event) => {
        event.preventDefault();
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
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

function updatedBlockContent(original: unknown, body: string, mediaUrl: string) {
  const content = record(original);
  for (const key of ["text", "body", "description", "content"]) {
    if (typeof content[key] === "string") delete content[key];
  }
  if (body.trim()) content.text = body.trim();
  if (mediaUrl.trim()) content.url = mediaUrl.trim();
  else {
    delete content.url;
    delete content.src;
  }
  return Object.keys(content).length ? content : null;
}

function usesMediaUrl(type: string) {
  return ["VIDEO", "IMAGE", "LISTENING"].includes(type);
}

function ContentBlockDialog({
  open,
  lessonId,
  onClose,
  onCreated,
}: {
  open: boolean;
  lessonId: string;
  onClose: () => void;
  onCreated: (type: ContentBlockType) => void;
}) {
  const [type, setType] = useState<ContentBlockType>("THEORY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = CONTENT_BLOCK_OPTIONS.find((option) => option.type === type) ?? CONTENT_BLOCK_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    setType("THEORY");
    setTitle("");
    setBody("");
    setMediaUrl("");
    setRequired(false);
    setError(null);
  }, [open]);

  function create() {
    startTransition(async () => {
      try {
        await api(`/api/admin/lessons/${lessonId}/blocks`, "POST", {
          type,
          title: title.trim() || selected.title,
          content: updatedBlockContent(null, body, mediaUrl) ?? undefined,
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
      <label className={styles.fieldLabel}>Learner-facing text<RichTextEditor value={body} onChange={setBody} /></label>
      {usesMediaUrl(type) ? <label className={styles.fieldLabel}>{type === "IMAGE" ? "Image" : type === "VIDEO" ? "Video" : "Audio"} URL<input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} type="url" placeholder="https://…" className={styles.field} /></label> : null}
      <label className={styles.visibility}><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />Required before lesson completion</label>
      {error ? <p role="alert" className={styles.dialogError}>{error}</p> : null}
    </div>
  </AppModal>;
}

function TheoryEditor({
  theory,
  onChange,
  onAddAudio,
  onAddVideo,
  onAddTask,
  onAddContentBlock,
  onNextStep,
  nextStepPending,
}: {
  theory: Theory;
  onChange: (next: Theory) => void;
  onAddAudio: () => void;
  onAddVideo: () => void;
  onAddTask: () => void;
  onAddContentBlock: () => void;
  onNextStep: () => void;
  nextStepPending: boolean;
}) {
  return <section className={styles.theoryCard}>
    <div className={styles.cardHeading}>
      <div>
        <p className={styles.eyebrow}>Step context</p>
        <h2>Explanation / theory</h2>
      </div>
      <label className={styles.visibility}><input type="checkbox" checked={theory.visible} onChange={(event) => onChange({ ...theory, visible: event.target.checked })} />Show to learner</label>
    </div>
    <label className={styles.fieldLabel}>
      What should help the learner solve this task?
      <RichTextEditor value={theory.text} onChange={(textValue) => onChange({ ...theory, text: textValue })} />
    </label>
    <div className={styles.theoryActions}>
      <button type="button" onClick={onAddAudio} className={styles.secondaryButton}>{theory.audioUrl ? "Edit audio" : "Add audio"}</button>
      <button type="button" onClick={onAddVideo} className={styles.secondaryButton}>{theory.videoUrl ? "Edit video" : "Add video"}</button>
      <button type="button" onClick={onAddContentBlock} className={styles.secondaryButton}>+ Content block</button>
      <button type="button" onClick={onAddTask} className={styles.primaryButton}>+ Add task</button>
      <button type="button" onClick={onNextStep} disabled={nextStepPending} className={styles.secondaryButton}>{nextStepPending ? "Creating…" : "Next step →"}</button>
    </div>
    {(theory.audioUrl || theory.videoUrl) ? <p className={styles.mediaSummary}>{theory.audioUrl ? "Audio attached" : ""}{theory.audioUrl && theory.videoUrl ? " · " : ""}{theory.videoUrl ? "Video attached" : ""}</p> : null}
  </section>;
}

function TaskEditor({ draft, onChange, onChangeEngine, onEditBlock }: { draft: Draft; onChange: (next: Draft) => void; onChangeEngine: () => void; onEditBlock?: () => void }) {
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
        <button type="button" onClick={onChangeEngine} className={styles.tertiaryButton}>Change engine</button>
      </div>
    </div>
    <p className={styles.taskDescription}>{engine?.description ?? kindMeta[draft.kind].description}</p>
    <div className={styles.formGrid}>
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
      <label className={`${styles.fieldLabel} ${styles.durationField}`}>Step time<select value={draft.duration} onChange={(event) => set("duration", event.target.value as Draft["duration"])} className={styles.field}><option value="auto">Automatic ({automaticWeight(draft.engineKey)} sec)</option><option value="20">20 sec</option><option value="35">35 sec</option><option value="45">45 sec</option><option value="60">1 min</option><option value="90">1.5 min</option></select></label>
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
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
}) {
  if (!open) return null;
  const engine = getExerciseEngine(draft.engineKey);
  return <section className={styles.taskPanel} role="dialog" aria-modal="false" aria-label="Task authoring panel">
    <header className={styles.taskPanelHeader}>
      <div><p className={styles.eyebrow}>{choosingEngine ? "Choose an interaction" : "Task authoring"}</p><h2>{choosingEngine ? "Add a task" : engine?.title ?? "Task"}</h2></div>
      <button type="button" onClick={onClose} className={styles.panelClose}>Close</button>
    </header>
    <div className={styles.taskPanelBody}>
      {choosingEngine ? <>
        <p className={styles.taskPanelIntro}>Choose a learning interaction. Its form stays here while the learner view updates live on the right.</p>
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
        <TaskEditor draft={draft} onChange={onChange} onChangeEngine={onChangeEngine} onEditBlock={onEditBlock} />
        <div className={styles.saveBar}><p>Configure the task, test it on the right, then save.</p><button type="button" disabled={isPending} onClick={onSave} className={styles.primaryButton}>{isPending ? "Saving…" : "Save task & next →"}</button></div>
      </>}
    </div>
  </section>;
}

function LearnerSlidePreview({ draft }: { draft: Draft }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [mapped, setMapped] = useState<Record<string, string>>({});

  useEffect(() => {
    setAnswer("");
    setResult(null);
    setSelected([]);
    setOrdered([]);
    setMapped({});
  }, [draft.id, draft.engineKey, draft.kind, draft.source, draft.options, draft.correctAnswer, draft.matchingPairs]);

  const gap = gapData(draft.source);
  const isGapFill = draft.engineKey === "fill-in-the-blanks";
  const expectedGap = isGapFill ? gap.answer : draft.correctAnswer.trim();
  const promptGap = isGapFill ? gap.learnerText : draft.source;
  const pairs = pairsFrom(draft.matchingPairs);
  const left = Object.keys(pairs);
  const right = Array.from(new Set(Object.values(pairs)));
  const options = lines(draft.options);
  const expectedChoices = draft.engineKey === "multiple-choice" ? lines(draft.correctAnswer) : [draft.correctAnswer.trim()].filter(Boolean);
  const tokens = draft.source.trim().split(/\s+/).filter(Boolean);
  const multiple = draft.engineKey === "multiple-choice";
  const hasLiveTaskContent = draft.kind === "gap" ? Boolean(promptGap || expectedGap || draft.correctAnswer.trim()) : draft.kind === "choice" ? options.length > 0 : draft.kind === "builder" ? tokens.length > 0 : left.length > 0 || right.length > 0;

  function check() {
    if (draft.kind === "gap") setResult(answer.trim().toLowerCase() === expectedGap.toLowerCase() ? "correct" : "incorrect");
    else if (draft.kind === "choice") setResult(selected.length === expectedChoices.length && selected.every((item) => expectedChoices.includes(item)) ? "correct" : "incorrect");
    else if (draft.kind === "builder") setResult(ordered.join(" ") === tokens.join(" ") ? "correct" : "incorrect");
    else setResult(left.every((item) => mapped[item] === pairs[item]) ? "correct" : "incorrect");
  }

  function toggleChoice(option: string) {
    setResult(null);
    setSelected((current) => multiple
      ? current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
      : [option]);
  }

  return <section className={styles.previewCard}>
    <div className={styles.previewHeading}><p className={styles.eyebrow}>Learner view</p><span>Live preview</span></div>
    <div className={styles.previewScroll}>
      {draft.theory.visible && (draft.theory.text || draft.theory.audioUrl || draft.theory.imageUrl || draft.theory.videoUrl) ? <section className={styles.previewTheory}>
        <p className={styles.eyebrow}>Before you answer</p>
        {draft.theory.text ? <div className={styles.theoryCopy} dangerouslySetInnerHTML={{ __html: sanitizeLessonRichText(draft.theory.text) }} /> : null}
        {draft.theory.imageUrl ? <img src={draft.theory.imageUrl} alt="Theory illustration" className={styles.previewImage} /> : null}
        {draft.theory.audioUrl ? <audio className={styles.previewMedia} controls src={draft.theory.audioUrl}>Audio is not supported.</audio> : null}
        {draft.theory.videoUrl ? <video className={styles.previewVideo} controls src={draft.theory.videoUrl}>Video is not supported.</video> : null}
      </section> : <p className={styles.previewHint}>Add a theory note, audio or video to see it here.</p>}
      <section className={styles.previewTask}>
        <p className={styles.previewInstruction}>{draft.instruction || "Complete the task."}</p>
        {draft.kind === "gap" ? (
          <>
            <p className={styles.previewPrompt}>{promptGap || "Your prompt appears here."}</p>
            <input value={answer} onChange={(event) => { setAnswer(event.target.value); setResult(null); }} className={styles.field} placeholder="Type your answer" />
          </>
        ) : null}
        {draft.kind === "choice" ? (
          <>
            <p className={styles.previewPrompt}>{draft.source || "Your question appears here."}</p>
            {hasLiveTaskContent ? (
              <div className={styles.answerStack}>{options.map((option) => <label key={option} className={styles.answerOption}><input type={multiple ? "checkbox" : "radio"} checked={selected.includes(option)} onChange={() => toggleChoice(option)} />{option}</label>)}</div>
            ) : (
              <div className={styles.previewEmptyState}>Add options to preview the task.</div>
            )}
          </>
        ) : null}
        {draft.kind === "builder" ? (
          <>
            <p className={styles.previewPrompt}>Build the sentence.</p>
            {hasLiveTaskContent ? (
              <>
                <div className={styles.tokenRow}>{tokens.map((token, index) => <button key={`${token}-${index}`} type="button" onClick={() => { setOrdered((items) => [...items, token]); setResult(null); }} className={styles.token}>{token}</button>)}</div>
                <div className={styles.answerTray}>{ordered.join(" ")}</div>
              </>
            ) : (
              <div className={styles.previewEmptyState}>Add a sentence to preview the builder.</div>
            )}
          </>
        ) : null}
        {draft.kind === "matching" ? (
          <>
            <p className={styles.previewPrompt}>{draft.source || "Match each pair."}</p>
            {hasLiveTaskContent ? (
              <div className={styles.matchList}>{left.map((item) => <label key={item} className={styles.matchRow}><span>{item}</span><select value={mapped[item] ?? ""} onChange={(event) => { setMapped({ ...mapped, [item]: event.target.value }); setResult(null); }} className={styles.field}><option value="">Choose</option>{right.map((value) => <option key={value}>{value}</option>)}</select></label>)}</div>
            ) : (
              <div className={styles.previewEmptyState}>Add matching pairs to preview the task.</div>
            )}
          </>
        ) : null}
        {draft.kind === "gap" && hasLiveTaskContent ? <button type="button" onClick={check} className={styles.primaryButton}>Check answer</button> : null}
        {draft.kind === "choice" && hasLiveTaskContent ? <button type="button" onClick={check} className={styles.primaryButton}>Check answer</button> : null}
        {draft.kind === "builder" && hasLiveTaskContent ? <button type="button" onClick={check} className={styles.primaryButton}>Check answer</button> : null}
        {draft.kind === "matching" && hasLiveTaskContent ? <button type="button" onClick={check} className={styles.primaryButton}>Check answer</button> : null}
        {result ? <p role="status" className={`${styles.result} ${result === "correct" ? styles.correct : styles.incorrect}`}>{result === "correct" ? "Correct — this configuration works." : "Not correct — test the expected answer."}</p> : null}
      </section>
    </div>
  </section>;
}

function stringifyJson(value: unknown) {
  return value == null ? "" : JSON.stringify(value, null, 2);
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
  const [settings, setSettings] = useState(stringifyJson(block?.settings));
  const [required, setRequired] = useState(block?.isRequired ?? false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(block?.title ?? "");
    setBody(blockBody(block?.content));
    setMediaUrl(blockMediaUrl(block?.content));
    setSettings(stringifyJson(block?.settings));
    setRequired(block?.isRequired ?? false);
    setConfirmRemoval(false);
    setError(null);
  }, [block]);

  function save() {
    if (!block) return;
    startTransition(async () => {
      try {
        await api(`/api/admin/blocks/${block.id}`, "PATCH", {
          title: title.trim() || undefined,
          content: updatedBlockContent(block.content, body, mediaUrl),
          settings: settings.trim() ? JSON.parse(settings) : null,
          isRequired: required,
        });
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
    : <><button type="button" onClick={() => setConfirmRemoval(true)} disabled={isPending} className={styles.dangerButton}>Remove block</button><span className={styles.footerSpacer} /><button type="button" onClick={onClose} disabled={isPending} className={styles.secondaryButton}>Cancel</button><button type="button" onClick={save} disabled={isPending} className={styles.primaryButton}>{isPending ? "Saving…" : "Save block"}</button></>;

  return <AppModal
    open={block !== null}
    onOpenChange={(open) => { if (!open) onClose(); }}
    title={block?.title ?? block?.type ?? "Edit lesson block"}
    description="Edit the learner-facing content with rich formatting. Exercise blocks retain their tasks and open in the visual task editor."
    size="large"
    footer={footer}
  >
    <div className={styles.blockDialogFields}>
      <label className={styles.fieldLabel}>Block title<input value={title} onChange={(event) => setTitle(event.target.value)} className={styles.field} /></label>
      <label className={styles.fieldLabel}>Learner-facing text<RichTextEditor value={body} onChange={setBody} /></label>
      {block && usesMediaUrl(block.type) ? <label className={styles.fieldLabel}>{block.type === "IMAGE" ? "Image" : block.type === "VIDEO" ? "Video" : "Audio"} URL<input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} type="url" placeholder="https://…" className={styles.field} /></label> : null}
      <label className={styles.visibility}><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />Required before lesson completion</label>
      <details className={styles.advancedFields}>
        <summary>Advanced settings</summary>
        <label className={styles.fieldLabel}>Settings JSON<textarea value={settings} onChange={(event) => setSettings(event.target.value)} className={`${styles.field} ${styles.jsonArea}`} /></label>
      </details>
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

function staticBlockSeconds(type: string) {
  if (type === "VIDEO" || type === "LISTENING") return 60;
  if (type === "THEORY" || type === "GRAMMAR" || type === "READING") return 45;
  return 20;
}

function LessonTimeline({
  items,
  totalSeconds,
  activeId,
  onSelect,
}: {
  items: TimelineItem[];
  totalSeconds: number;
  activeId: string;
  onSelect: (item: TimelineItem) => void;
}) {
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
    <nav className={styles.timeline} aria-label="Lesson block timeline">
      {items.map((item, index) => <button key={item.id} type="button" onClick={() => onSelect(item)} data-tone={timelineToneIndex(item.id)} className={`${styles.timelineItem} ${item.exercise?.id === activeId || (item.kind === "draft" && activeId === "new") ? styles.timelineItemActive : ""}`}><span>{index + 1} · ~{item.seconds} sec</span><strong>{item.label}</strong><em>{item.kind === "exercise" ? "Task" : item.kind === "draft" ? "Draft" : item.block?.type}</em></button>)}
      {items.length === 0 ? <p className={styles.emptySteps}>No lesson blocks yet. Create the first task from Explanation / theory.</p> : null}
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
  const [contentBlockCreatorOpen, setContentBlockCreatorOpen] = useState(false);
  const [mediaDialog, setMediaDialog] = useState<"audio" | "video" | null>(null);
  const [isPending, startTransition] = useTransition();
  const steps = useMemo(() => blocks.filter((block) => block.type === "EXERCISE").flatMap((block) => block.exercises.map((exercise) => ({ exercise, blockId: block.id }))), [blocks]);
  const activeStep = steps.find((step) => step.exercise.id === activeId);
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const savedItems = blocks.flatMap<TimelineItem>((block) => {
    if (block.exercises.length) {
      return block.exercises.map((exercise): TimelineItem => ({
        id: `exercise-${exercise.id}`,
        label: exercise.question || block.title || "Untitled task",
        kind: "exercise",
        block,
        exercise,
        seconds: estimatedSeconds(draftFrom(exercise, block.id)),
      }));
    }
    return [{
      id: `block-${block.id}`,
      label: block.title || block.type.replace(/_/g, " "),
      kind: "block",
      block,
      seconds: staticBlockSeconds(block.type),
    }];
    });
    if (!hasPendingStep) return savedItems;
    return [...savedItems, {
      id: "draft-next-step",
      label: "New lesson step",
      kind: "draft",
      seconds: editingNewTask ? estimatedSeconds(draft) : 20,
    }];
  }, [blocks, draft, editingNewTask, hasPendingStep]);
  const totalSeconds = timelineItems.reduce((total, item) => total + item.seconds, 0);

  useEffect(() => {
    if (activeId === "new") return;
    const next = steps.find((step) => step.exercise.id === activeId);
    if (next) setDraft(draftFrom(next.exercise, next.blockId));
  }, [activeId, blocks, steps]);

  function selectStep(id: string) {
    setMessage(null);
    setTaskPanelOpen(false);
    setEnginePickerOpen(false);
    setEditingNewTask(false);
    setActiveId(id);
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
      setActiveId("new");
      setEditingNewTask(false);
      return;
    }
    if (item.exercise) {
      selectStep(item.exercise.id);
      return;
    }
    const block = item.block;
    if (!block) return;
    if (block.type === "EXERCISE") {
      setMessage(null);
      if (block.exercises.length > 0) {
        selectStep(block.exercises[0].id);
        return;
      }
      setActiveId("new");
      setDraft((current) => ({
        ...defaultDraft(current.theory),
        blockId: block.id,
        duration: current.duration,
      }));
      setEditingNewTask(true);
      return;
    }
    setSelectedBlock(block);
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
    <LessonTimeline items={timelineItems} totalSeconds={totalSeconds} activeId={activeId} onSelect={selectTimelineItem} />
    <div className={styles.workspace}>
      <TaskAuthoringPanel open={taskPanelOpen} choosingEngine={enginePickerOpen} draft={draft} onChange={setDraft} onChooseEngine={chooseEngine} onChangeEngine={() => setEnginePickerOpen(true)} onEditBlock={openDraftBlockSettings} onClose={closeTaskPanel} onSave={saveAndNext} isPending={isPending} />
      <div className={styles.authorColumn}>
      <TheoryEditor
        theory={draft.theory}
        onChange={(theory) => setDraft({ ...draft, theory })}
        onAddAudio={() => setMediaDialog("audio")}
        onAddVideo={() => setMediaDialog("video")}
        onAddContentBlock={() => setContentBlockCreatorOpen(true)}
        onAddTask={() => openTaskPicker()}
        onNextStep={createNextStep}
        nextStepPending={isPending}
      />
      <div className={styles.authorScroll}>
        {!taskPanelOpen && (activeId === "new" && !editingNewTask ? null : <TaskEditor draft={draft} onChange={setDraft} onChangeEngine={() => { setTaskPanelOpen(true); setEnginePickerOpen(true); }} onEditBlock={openDraftBlockSettings} />)}
        {!taskPanelOpen && (activeId !== "new" || editingNewTask) ? <div className={styles.saveBar}><p>{activeStep ? "Changes update this learner slide." : "Configure the task, test it on the right, then save."}</p><button type="button" disabled={isPending} onClick={saveAndNext} className={styles.primaryButton}>{isPending ? "Saving…" : "Save task & next →"}</button></div> : null}
        {message ? <p role="status" className={styles.statusMessage}>{message}</p> : null}
      </div>
      </div>
      <aside className={styles.previewColumn}>
      <LearnerSlidePreview key={`${activeId}-${draft.engineKey}`} draft={draft} />
    </aside>
    </div>
    <MediaDialog kind={mediaDialog} value={mediaDialog === "audio" ? draft.theory.audioUrl : draft.theory.videoUrl} onClose={() => setMediaDialog(null)} onSave={(value) => setDraft((current) => ({ ...current, theory: mediaDialog === "audio" ? { ...current.theory, audioUrl: value } : { ...current.theory, videoUrl: value } }))} />
    <ContentBlockDialog
      open={contentBlockCreatorOpen}
      lessonId={lessonId}
      onClose={() => setContentBlockCreatorOpen(false)}
      onCreated={(type) => {
        setContentBlockCreatorOpen(false);
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
