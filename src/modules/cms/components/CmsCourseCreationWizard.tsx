"use client";

import Link from "next/link";
import { ClipboardEvent, FormEvent, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./CmsCourseBuilder.module.css";

type Level = { code: string; title: string };
type Category = { slug: string; title: string };
type Author = { id: string; name: string | null; email: string; role: string };
type NodeType = "SECTION" | "TOPIC" | "SUBTOPIC";
type CurriculumNode = { id: string; type: NodeType; title: string; slug: string; levelCode: string; parentId: string | null };
type CreatedCourse = { id: string; slug: string; title: string };
type Module = { id: string; title: string };
type Lesson = { id: string; title: string; moduleId: string };
type Block = { id: string; title: string; lessonId: string; type: string };
type IntegrityIssue = { code: string; message: string; entityType?: string; entityId?: string };

type AccessMode = "FREE" | "SUBSCRIPTION" | "ONE_TIME_PURCHASE" | "TEACHER_ASSIGNMENT" | "HIDDEN";
type CourseType = "STANDARD" | "INTENSIVE" | "EXAM_PREP" | "PROFESSIONAL" | "SPECIALIZATION" | "SKILL";

const MAX_PASTED_COVER_BYTES = 8 * 1024 * 1024;
const MAX_PASTED_COVER_DATA_URL_LENGTH = 2_500_000;

const steps = [
  ["Basics", "Title, content and author"],
  ["Classification", "Level and curriculum placement"],
  ["Access", "Who can enrol"],
  ["Structure", "Modules, lessons and learning blocks"],
  ["Display", "Learner-facing surfaces"],
  ["Review", "Preview and integrity checks"],
  ["Publish", "Draft, now or scheduled"],
] as const;

async function request<T>(url: string, method: "POST" | "PATCH" | "PUT" | "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error ?? "The CMS request could not be completed.");
  return payload.data;
}

function slugFromTitle(title: string) {
  return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The copied image could not be read."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The copied image could not be read."));
    reader.readAsDataURL(file);
  });
}

async function optimisePastedCover(file: File) {
  if (file.size > MAX_PASTED_COVER_BYTES) throw new Error("Choose an image smaller than 8 MB.");

  if (typeof createImageBitmap !== "function") return readImageAsDataUrl(file);

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / bitmap.width, 900 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.74, 0.62]) {
      const dataUrl = canvas.toDataURL("image/webp", quality);
      if (dataUrl.length <= MAX_PASTED_COVER_DATA_URL_LENGTH) return dataUrl;
    }
  } finally {
    bitmap.close();
  }

  throw new Error("The copied image is too large after compression. Use an image up to 1600×900 pixels.");
}

function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-semibold text-slate-900">{label}</span>{description ? <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span> : null}</span></label>;
}

export function CmsCourseCreationWizard({
  levels,
  categories,
  authors,
  curriculumNodes,
  initialLevelCode,
}: {
  levels: Level[];
  categories: Category[];
  authors: Author[];
  curriculumNodes: CurriculumNode[];
  initialLevelCode?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const stepWindowRef = useRef<HTMLDivElement>(null);
  const [isStepWindowOpen, setStepWindowOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [course, setCourse] = useState<CreatedCourse | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityIssue[] | null>(null);
  const [hasFinalized, setHasFinalized] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitleState] = useState("");
  const [slug, setSlugState] = useState("");
  const [slugIsManuallyEdited, setSlugIsManuallyEdited] = useState(false);
  const slugInputRef = useRef(false);
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [coverImage, setCoverImageValue] = useState("");
  const [pastedCoverImage, setPastedCoverImage] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [authorId, setAuthorId] = useState("");
  const [levelCode, setLevelCode] = useState(levels.some((item) => item.code === initialLevelCode) ? initialLevelCode! : levels[0]?.code ?? "A1");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "general-english");
  const [sectionId, setSectionId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subtopicId, setSubtopicId] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("STANDARD");
  const [accessMode, setAccessMode] = useState<AccessMode>("FREE");
  const [accessPlan, setAccessPlan] = useState("PREMIUM");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [firstFreeLessonCount, setFirstFreeLessonCount] = useState(0);
  const [display, setDisplay] = useState({ catalog: true, search: true, homepage: true, recommendations: false, levelBlock: true, academy: true, studentDashboard: true });
  const [publication, setPublication] = useState<"DRAFT" | "REVIEW" | "PUBLISH" | "SCHEDULE">("DRAFT");
  const [scheduledAt, setScheduledAt] = useState("");
  const [newNodeType, setNewNodeType] = useState<"TOPIC" | "SUBTOPIC" | null>(null);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeSlug, setNewNodeSlug] = useState("");

  const availableNodes = useMemo(() => curriculumNodes.filter((node) => node.levelCode === levelCode), [curriculumNodes, levelCode]);
  const sections = useMemo(() => availableNodes.filter((node) => node.type === "SECTION"), [availableNodes]);
  const topics = useMemo(() => availableNodes.filter((node) => node.type === "TOPIC" && (!sectionId || node.parentId === sectionId)), [availableNodes, sectionId]);
  const subtopics = useMemo(() => availableNodes.filter((node) => node.type === "SUBTOPIC" && (!topicId || node.parentId === topicId)), [availableNodes, topicId]);
  const primaryNodeId = subtopicId || topicId || sectionId;

  function resetPlacement(nextLevelCode: string) {
    setLevelCode(nextLevelCode); setSectionId(""); setTopicId(""); setSubtopicId("");
  }

  function setTitle(nextTitle: string) {
    setTitleState(nextTitle);
    if (!slugIsManuallyEdited) setSlugState(slugFromTitle(nextTitle));
  }

  function setSlug(nextSlug: string) {
    const normalizedSlug = slugFromTitle(nextSlug);
    setSlugState(normalizedSlug);
    if (slugInputRef.current) setSlugIsManuallyEdited(normalizedSlug.length > 0);
  }

  function setCoverImage(nextCoverImage: string) {
    setPastedCoverImage(null);
    setCoverImageValue(nextCoverImage);
  }

  function trackCourseInput(event: FormEvent<HTMLElement>) {
    slugInputRef.current = event.target instanceof HTMLInputElement && event.target.placeholder === "present-simple-essentials";
  }

  async function handleCoverPaste(event: ClipboardEvent<HTMLElement>) {
    if (!isStepWindowOpen || step !== 0) return;

    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      event.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      try {
        const pastedImage = await optimisePastedCover(file);
        setPastedCoverImage(pastedImage);
        setMessage({ text: "Cover image pasted and ready to save with the course." });
      } catch (error) {
        setMessage({ text: error instanceof Error ? error.message : "Unable to use the copied image.", error: true });
      }
      return;
    }

    const copiedHtml = event.clipboardData.getData("text/html");
    if (!copiedHtml) return;
    const source = new DOMParser().parseFromString(copiedHtml, "text/html").querySelector("img")?.getAttribute("src");
    if (source && /^https?:\/\//i.test(source)) {
      event.preventDefault();
      setCoverImage(source);
      setMessage({ text: "Cover image link pasted and ready to save with the course." });
    }
  }

  function openStep(index: number) {
    setStep(index);
    setStepWindowOpen(true);
    window.requestAnimationFrame(() => {
      stepWindowRef.current?.focus({ preventScroll: true });
    });
  }

  function basePayload() {
    const paidAmount = priceAmount.trim() ? Math.round(Number(priceAmount) * 100) : undefined;
    return {
      title: title.trim(), slug: slug.trim() || undefined, shortDescription: shortDescription.trim(), fullDescription: fullDescription.trim() || undefined,
      coverImage: (pastedCoverImage ?? coverImage).trim() || undefined, language: language.trim() || "en", levelCode, categorySlug, instructorId: authorId || undefined,
      estimatedDuration: 0, difficulty: undefined, isFeatured: display.recommendations,
      courseType, accessMode, accessPlan: accessMode === "SUBSCRIPTION" ? accessPlan : "FREE", priceAmount: accessMode === "ONE_TIME_PURCHASE" ? paidAmount : undefined,
      priceCurrency, firstFreeLessonCount, learningOutcomes: [], prerequisites: [],
      isVisibleInCatalog: display.catalog, isVisibleInSearch: display.search, isVisibleOnHomepage: display.homepage,
      isVisibleInRecommendations: display.recommendations, isVisibleInLevelBlock: display.levelBlock,
      isVisibleInAcademy: display.academy, isVisibleInStudentDashboard: display.studentDashboard,
    };
  }

  function validateBasics() {
    if (title.trim().length < 2) throw new Error("Enter a course title (at least 2 characters).");
    if (shortDescription.trim().length < 10) throw new Error("Enter a short description (at least 10 characters).");
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug may contain lowercase letters, numbers and hyphens only.");
    if (accessMode === "ONE_TIME_PURCHASE" && (!priceAmount || Number(priceAmount) < 0)) throw new Error("Enter a valid one-time price.");
  }

  async function savePlacement(courseId: string) {
    await request(`/api/admin/cms/courses/${courseId}/curriculum-links`, "PUT", { links: primaryNodeId ? [{ nodeId: primaryNodeId, relation: "PRIMARY" }] : [] });
  }

  async function ensureDraft() {
    validateBasics();
    if (course) {
      await request(`/api/admin/courses/${course.id}`, "PATCH", basePayload());
      await savePlacement(course.id);
      return course;
    }
    const created = await request<CreatedCourse>("/api/admin/courses", "POST", { ...basePayload(), isPublished: false });
    setCourse(created);
    await savePlacement(created.id);
    return created;
  }

  function next() {
    startTransition(async () => {
      setMessage(null);
      try {
        if (step === 0) validateBasics();
        if (step === 1) await ensureDraft();
        if (step === 2 || step === 4) await ensureDraft();
        if (step === 5) await runValidation();
        setStep((current) => Math.min(current + 1, steps.length - 1));
      } catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to continue.", error: true }); }
    });
  }

  async function createNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newNodeType) return;
    const parentId = newNodeType === "TOPIC" ? sectionId : topicId;
    if (!parentId) { setMessage({ text: `Select a ${newNodeType === "TOPIC" ? "section" : "topic"} first.`, error: true }); return; }
    startTransition(async () => {
      setMessage(null);
      try {
        const created = await request<{ id: string; title: string; slug: string }>("/api/admin/cms/curriculum", "POST", {
          levelCode, type: newNodeType, parentId, title: newNodeTitle.trim(), slug: newNodeSlug.trim() || slugFromTitle(newNodeTitle), locale: language || "en", showOnHomepage: false, showInSearch: true,
        });
        if (newNodeType === "TOPIC") { setTopicId(created.id); setSubtopicId(""); } else setSubtopicId(created.id);
        setNewNodeType(null); setNewNodeTitle(""); setNewNodeSlug(""); setMessage({ text: `${created.title} was added as a draft.` }); router.refresh();
      } catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to create curriculum item.", error: true }); }
    });
  }

  function addModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!course) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try { const created = await request<Module>(`/api/admin/courses/${course.id}/modules`, "POST", { title: form.get("moduleTitle"), description: form.get("moduleDescription") || undefined, isPublished: false }); setModules((items) => [...items, created]); event.currentTarget.reset(); setMessage({ text: "Module added to the draft." }); }
      catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to add module.", error: true }); }
    });
  }

  function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const moduleId = String(form.get("lessonModuleId") || ""); if (!moduleId) return;
    startTransition(async () => {
      try { const created = await request<Lesson>(`/api/admin/modules/${moduleId}/lessons`, "POST", { title: form.get("lessonTitle"), description: form.get("lessonDescription") || undefined, type: form.get("lessonType"), estimatedDuration: Number(form.get("lessonMinutes") || 0), learningObjectives: [], isPublished: false, isFree: false }); setLessons((items) => [...items, { ...created, moduleId }]); event.currentTarget.reset(); setMessage({ text: "Lesson added to the draft." }); }
      catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to add lesson.", error: true }); }
    });
  }

  function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const lessonId = String(form.get("blockLessonId") || ""); if (!lessonId) return;
    const type = String(form.get("blockType") || "THEORY");
    startTransition(async () => {
      try { const created = await request<Block>(`/api/admin/lessons/${lessonId}/blocks`, "POST", { type, title: form.get("blockTitle") || undefined, content: { text: String(form.get("blockContent") || "") }, isRequired: false }); setBlocks((items) => [...items, { ...created, lessonId, type }]); event.currentTarget.reset(); setMessage({ text: `${type.toLowerCase()} block added.` }); }
      catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to add learning block.", error: true }); }
    });
  }

  function addExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const blockId = String(form.get("exerciseBlockId") || ""); if (!blockId) return;
    startTransition(async () => {
      try { await request(`/api/admin/blocks/${blockId}/exercises`, "POST", { type: "TEXT_INPUT", instruction: form.get("exerciseInstruction"), question: form.get("exerciseQuestion"), correctAnswer: String(form.get("exerciseAnswer") || ""), content: {}, difficulty: 1, basePoints: 1 }); event.currentTarget.reset(); setMessage({ text: "Exercise added. Use the detailed editor to select another engine or variant." }); }
      catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to add exercise.", error: true }); }
    });
  }

  async function runValidation() {
    const current = await ensureDraft();
    const result = await request<{ integrity: IntegrityIssue[] }>(`/api/admin/cms/content/COURSE/${current.id}`, "GET");
    setIntegrity(result.integrity);
    setMessage(result.integrity.length ? { text: "Resolve the listed issues before publishing.", error: true } : { text: "The course passed the publication integrity check." });
  }

  function finish(action: "DRAFT" | "REVIEW" | "PUBLISH" | "SCHEDULE") {
    startTransition(async () => {
      try {
        const current = await ensureDraft();
        if (action === "REVIEW") await request(`/api/admin/cms/content/COURSE/${current.id}`, "PATCH", { action: "SUBMIT_FOR_REVIEW" });
        if (action === "PUBLISH" || action === "SCHEDULE") {
          if (action === "SCHEDULE" && !scheduledAt) throw new Error("Choose a future publication date and time.");
          await request(`/api/admin/cms/content/COURSE/${current.id}`, "PATCH", { action, ...(action === "SCHEDULE" ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}) });
        }
        setHasFinalized(true);
        setMessage({ text: action === "DRAFT" ? "Draft saved. You can return to it from Courses." : action === "REVIEW" ? "Course sent to review." : action === "PUBLISH" ? "Course published." : "Course publication scheduled." });
        router.refresh();
      } catch (error) { setMessage({ text: error instanceof Error ? error.message : "Unable to update publication status.", error: true }); }
    });
  }

  const exerciseBlocks = blocks.filter((block) => block.type === "EXERCISE");
  const courseEditorHref = course ? `/cms/courses/${course.id}` : "/cms/courses";
  const hasBasics = title.trim().length >= 2 && shortDescription.trim().length >= 10;
  const hasValidPrice = accessMode !== "ONE_TIME_PURCHASE" || (priceAmount.trim().length > 0 && Number(priceAmount) >= 0);
  const stepComplete = [
    hasBasics,
    Boolean(course),
    Boolean(course) && hasValidPrice,
    modules.length > 0 && lessons.length > 0 && blocks.length > 0,
    Boolean(course) && Object.values(display).some(Boolean),
    integrity !== null && integrity.length === 0,
    hasFinalized,
  ];

  return <section ref={stepWindowRef} tabIndex={-1} onChangeCapture={trackCourseInput} onPasteCapture={handleCoverPaste} className={`${styles.wizard} ${isStepWindowOpen ? styles.wizardOpen : styles.wizardClosed} space-y-6`} aria-label={`${steps[step][0]} course creation step`}>
    {isStepWindowOpen ? <button type="button" onClick={() => setStepWindowOpen(false)} className={styles.closeStepButton} aria-label="Close course step editor">Close</button> : null}
    {isStepWindowOpen && step === 0 ? <aside className={styles.coverPasteHint} aria-live="polite">{pastedCoverImage || coverImage ? <><img src={pastedCoverImage ?? coverImage} alt="Selected course cover preview" /><span>Cover ready. You can paste another image to replace it.</span></> : "Copy an image and press Ctrl+V anywhere in this window to use it as the course cover."}</aside> : null}
    <nav aria-label="Course creation steps" className={styles.stepNavigation}>{steps.map(([label, detail], index) => {
      const completed = stepComplete[index];
      const current = index === step;
      return <button key={label} type="button" onClick={() => openStep(index)} aria-current={current ? "step" : undefined} className={`${styles.stepCard} ${current ? styles.stepCurrent : ""} ${completed ? styles.stepComplete : ""}`}>
        <span className={styles.stepCardTop}><span className={styles.stepNumber}>Step {index + 1}</span><span className={styles.stepState}>{completed ? "Complete" : current ? "Editing" : "Open"}</span></span>
        <span className={styles.stepLabel}>{label}</span>
        <span className={styles.stepDescription}>{detail}</span>
        <span className={styles.stepAction}>{completed ? "Open and edit" : "Open step"} <span aria-hidden="true">→</span></span>
      </button>;
    })}</nav>
    {message ? <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message.text}</p> : null}

    {step === 0 ? <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2"><div className="md:col-span-2"><h2 className="text-xl font-bold text-slate-950">1. Basic course data</h2><p className="mt-1 text-sm text-slate-600">A draft is not created until its classification is selected on the next step.</p></div><label className="md:col-span-2 text-sm font-medium">Course title<input value={title} onChange={(event) => { setTitle(event.target.value); if (!slug) setSlug(slugFromTitle(event.target.value)); }} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">Slug<input value={slug} onChange={(event) => setSlug(slugFromTitle(event.target.value))} placeholder="present-simple-essentials" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" /><span className="mt-1 block text-xs text-slate-500">A unique public URL is generated automatically if this is left empty.</span></label><label className="md:col-span-2 text-sm font-medium">Short description<textarea value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} minLength={10} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="md:col-span-2 text-sm font-medium">Full description<textarea value={fullDescription} onChange={(event) => setFullDescription(event.target.value)} className="mt-1 min-h-36 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Cover image URL<input type="url" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /><Link href="/cms/media" className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline">Open Media Library</Link></label><label className="text-sm font-medium">Content language<select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="en">English</option><option value="uk">Ukrainian</option><option value="ru">Russian</option><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option></select></label><label className="text-sm font-medium">Course author<select value={authorId} onChange={(event) => setAuthorId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Current CMS owner</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email} · {author.email}</option>)}</select></label><label className="text-sm font-medium">Planned publication status<select value={publication} onChange={(event) => setPublication(event.target.value as typeof publication)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="DRAFT">Draft</option><option value="PUBLISH">Publish after review</option><option value="SCHEDULE">Schedule after review</option></select></label></section> : null}

    {step === 1 ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="text-xl font-bold text-slate-950">2. Classification and placement</h2><p className="mt-1 text-sm text-slate-600">A course always belongs to one CEFR level and category. Its closest selected curriculum item is saved as the primary placement.</p></div><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">CEFR level<select value={levelCode} onChange={(event) => resetPlacement(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{levels.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.title}</option>)}</select></label><label className="text-sm font-medium">Category<select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{categories.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label><label className="text-sm font-medium">Course type<select value={courseType} onChange={(event) => setCourseType(event.target.value as CourseType)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="STANDARD">Standard</option><option value="INTENSIVE">Intensive</option><option value="EXAM_PREP">Exam preparation</option><option value="PROFESSIONAL">Professional</option><option value="SPECIALIZATION">Specialization</option><option value="SKILL">Skill course</option></select></label></div><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">Section<select value={sectionId} onChange={(event) => { setSectionId(event.target.value); setTopicId(""); setSubtopicId(""); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Level only</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium">Topic<select value={topicId} onChange={(event) => { setTopicId(event.target.value); setSubtopicId(""); }} disabled={!sectionId} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"><option value="">{sectionId ? "No topic selected" : "Select section first"}</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium">Subtopic<select value={subtopicId} onChange={(event) => setSubtopicId(event.target.value)} disabled={!topicId} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"><option value="">{topicId ? "No subtopic selected" : "Select topic first"}</option>{subtopics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setNewNodeType("TOPIC")} disabled={!sectionId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">New topic</button><button type="button" onClick={() => setNewNodeType("SUBTOPIC")} disabled={!topicId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">New subtopic</button><Link href={`/cms/sections?level=${levelCode}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Manage curriculum tree</Link></div>{newNodeType ? <form onSubmit={createNode} className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2"><p className="md:col-span-2 text-sm font-bold">Create {newNodeType.toLowerCase()} in {levelCode}</p><label className="text-sm font-medium">Title<input required value={newNodeTitle} onChange={(event) => { setNewNodeTitle(event.target.value); if (!newNodeSlug) setNewNodeSlug(slugFromTitle(event.target.value)); }} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium">Slug<input required value={newNodeSlug} onChange={(event) => setNewNodeSlug(slugFromTitle(event.target.value))} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono" /></label><div className="md:col-span-2 flex gap-3"><button disabled={isPending} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create as draft</button><button type="button" onClick={() => setNewNodeType(null)} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold">Cancel</button></div></form> : null}<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Primary placement: <strong>{primaryNodeId ? availableNodes.find((node) => node.id === primaryNodeId)?.title ?? "Selected item" : `${levelCode} level only`}</strong></p></section> : null}

    {step === 2 ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="text-xl font-bold text-slate-950">3. Learner access</h2><p className="mt-1 text-sm text-slate-600">Editorial access is stored independently of billing plan and price, so downstream access checks can apply one clear rule.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{([ ["FREE", "Free"], ["SUBSCRIPTION", "Subscription"], ["ONE_TIME_PURCHASE", "One-time purchase"], ["TEACHER_ASSIGNMENT", "Teacher assignment"], ["HIDDEN", "Hidden"] ] as Array<[AccessMode, string]>).map(([value, label]) => <label key={value} className={`cursor-pointer rounded-xl border p-4 ${accessMode === value ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}><input type="radio" name="accessMode" value={value} checked={accessMode === value} onChange={() => setAccessMode(value)} className="sr-only" /><span className="font-semibold text-slate-900">{label}</span></label>)}</div>{accessMode === "SUBSCRIPTION" ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Required subscription<select value={accessPlan} onChange={(event) => setAccessPlan(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="PREMIUM">Premium</option><option value="CORPORATE">Corporate</option></select></label><label className="text-sm font-medium">Free introductory lessons<input type="number" min="0" value={firstFreeLessonCount} onChange={(event) => setFirstFreeLessonCount(Number(event.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div> : null}{accessMode === "ONE_TIME_PURCHASE" ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Price<input type="number" min="0" step="0.01" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Currency<select value={priceCurrency} onChange={(event) => setPriceCurrency(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="USD">USD</option><option value="EUR">EUR</option><option value="UAH">UAH</option></select></label></div> : null}<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{accessMode === "HIDDEN" ? "Hidden courses are retained in the CMS but are not intended for discovery." : accessMode === "TEACHER_ASSIGNMENT" ? "Students should reach this course through a teacher or group assignment." : "The final learner gate continues to be enforced by the existing server-side access service."}</p></section> : null}

    {step === 3 ? <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">4. Course structure</h2><p className="mt-1 text-sm text-slate-600">Build a useful first outline here, then open the detailed editor for all exercise engines, media and assignments.</p></div>{course ? <Link href={courseEditorHref} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Open detailed editor</Link> : null}</div>{!course ? <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">The draft is being prepared. Continue from classification first.</p> : <><form onSubmit={addModule} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"><p className="md:col-span-2 font-semibold">Add module</p><input name="moduleTitle" required minLength={2} placeholder="Module title" className="rounded-lg border border-slate-300 px-3 py-2" /><input name="moduleDescription" placeholder="Description (optional)" className="rounded-lg border border-slate-300 px-3 py-2" /><button disabled={isPending} className="md:col-span-2 w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add module</button></form>{modules.length ? <form onSubmit={addLesson} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"><p className="md:col-span-2 font-semibold">Add lesson or final test</p><select name="lessonModuleId" required className="rounded-lg border border-slate-300 px-3 py-2"><option value="">Choose module</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input name="lessonTitle" required minLength={2} placeholder="Lesson title" className="rounded-lg border border-slate-300 px-3 py-2" /><select name="lessonType" defaultValue="THEORY" className="rounded-lg border border-slate-300 px-3 py-2">{["THEORY", "PRACTICE", "VOCABULARY", "GRAMMAR", "READING", "LISTENING", "WRITING", "TEST", "PROJECT", "MIXED"].map((item) => <option key={item} value={item}>{item}</option>)}</select><input name="lessonMinutes" type="number" min="0" defaultValue="0" className="rounded-lg border border-slate-300 px-3 py-2" /><input name="lessonDescription" placeholder="Description (optional)" className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" /><button disabled={isPending} className="md:col-span-2 w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add lesson</button></form> : null}{lessons.length ? <form onSubmit={addBlock} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"><p className="md:col-span-2 font-semibold">Add theory, material, homework or exercise block</p><select name="blockLessonId" required className="rounded-lg border border-slate-300 px-3 py-2"><option value="">Choose lesson</option>{lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select name="blockType" defaultValue="THEORY" className="rounded-lg border border-slate-300 px-3 py-2">{["THEORY", "EXERCISE", "HOMEWORK", "VIDEO", "IMAGE", "READING", "LISTENING", "REVIEW"].map((item) => <option key={item} value={item}>{item}</option>)}</select><input name="blockTitle" placeholder="Block title" className="rounded-lg border border-slate-300 px-3 py-2" /><textarea name="blockContent" placeholder="Theory, instructions or material text" className="min-h-20 rounded-lg border border-slate-300 px-3 py-2" /><button disabled={isPending} className="md:col-span-2 w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add block</button></form> : null}{exerciseBlocks.length ? <form onSubmit={addExercise} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"><p className="md:col-span-2 font-semibold">Add an exercise</p><select name="exerciseBlockId" required className="rounded-lg border border-slate-300 px-3 py-2"><option value="">Choose exercise block</option>{exerciseBlocks.map((item) => <option key={item.id} value={item.id}>{item.title || "Exercise block"}</option>)}</select><input name="exerciseInstruction" required placeholder="Instruction" className="rounded-lg border border-slate-300 px-3 py-2" /><textarea name="exerciseQuestion" required placeholder="Question" className="min-h-20 rounded-lg border border-slate-300 px-3 py-2" /><input name="exerciseAnswer" required placeholder="Correct answer" className="rounded-lg border border-slate-300 px-3 py-2" /><button disabled={isPending} className="md:col-span-2 w-fit rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add exercise</button></form> : null}<div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">Current draft outline</p><p className="mt-1">{modules.length} modules · {lessons.length} lessons · {blocks.length} learning blocks.</p><p className="mt-2 text-xs text-slate-500">For final tests, choose TEST and add an EXERCISE or REVIEW block. For assignments, add a HOMEWORK block; teacher assignment access is set in step 3.</p></div></>}</section> : null}

    {step === 4 ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="text-xl font-bold text-slate-950">5. Learner-facing display</h2><p className="mt-1 text-sm text-slate-600">These options are persisted on the course and used by the relevant public or learner query. A course must still be published before any public surface can render it.</p></div><div className="grid gap-3 md:grid-cols-2"><Toggle label="Course catalog" checked={display.catalog} onChange={(value) => setDisplay((current) => ({ ...current, catalog: value }))} description="Appears in the public course catalogue." /><Toggle label="Search" checked={display.search} onChange={(value) => setDisplay((current) => ({ ...current, search: value }))} description="May appear in public search results." /><Toggle label="Homepage" checked={display.homepage} onChange={(value) => setDisplay((current) => ({ ...current, homepage: value }))} description="Marks this course for the homepage feature area." /><Toggle label="Recommendations" checked={display.recommendations} onChange={(value) => setDisplay((current) => ({ ...current, recommendations: value }))} description="Makes the course eligible for recommendation modules." /><Toggle label="Level block" checked={display.levelBlock} onChange={(value) => setDisplay((current) => ({ ...current, levelBlock: value }))} description={`Appears in the ${levelCode} level course list.`} /><Toggle label="Academy" checked={display.academy} onChange={(value) => setDisplay((current) => ({ ...current, academy: value }))} description="Allows the academy surface to include this course." /><Toggle label="Student dashboard" checked={display.studentDashboard} onChange={(value) => setDisplay((current) => ({ ...current, studentDashboard: value }))} description="Allows personalized student-dashboard modules to include it." /></div></section> : null}

    {step === 5 ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">6. Review and integrity checks</h2><p className="mt-1 text-sm text-slate-600">The same server-side checks used by publication are run here. They never expose an unfinished course to learners.</p></div><div className="flex gap-2">{course ? <Link href={`/cms/preview/courses/${course.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Open preview</Link> : null}<button type="button" onClick={() => startTransition(() => { void runValidation().catch((error: unknown) => setMessage({ text: error instanceof Error ? error.message : "Unable to validate.", error: true })); })} disabled={isPending} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Run checks</button></div></div>{course ? <dl className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">CMS preview</dt><dd className="mt-1 text-sm font-semibold">Available</dd></div><div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Learner URL</dt><dd className="mt-1 break-all text-sm font-semibold">/courses/{course.slug}</dd></div><div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Placement</dt><dd className="mt-1 text-sm font-semibold">{primaryNodeId ? "Curriculum linked" : "Level only"}</dd></div></dl> : null}{integrity === null ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">Run checks to validate required fields, route, dependencies, exercise structure and missing content before publishing.</p> : integrity.length ? <ul className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">{integrity.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{issue.code}:</strong> {issue.message}</li>)}</ul> : <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">All publication integrity checks passed.</p>}</section> : null}

    {step === 6 ? <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="text-xl font-bold text-slate-950">7. Save or publish</h2><p className="mt-1 text-sm text-slate-600">Publication always repeats server-side integrity checks. A failed check leaves the course safe as a draft.</p></div><div className="grid gap-3 md:grid-cols-4"><button type="button" disabled={isPending} onClick={() => finish("DRAFT")} className="rounded-xl border border-slate-300 p-5 text-left font-semibold hover:bg-slate-50 disabled:opacity-50">Save draft<span className="mt-1 block text-sm font-normal text-slate-600">Keep building later.</span></button><button type="button" disabled={isPending} onClick={() => finish("REVIEW")} className="rounded-xl border border-slate-300 p-5 text-left font-semibold hover:bg-slate-50 disabled:opacity-50">Send to review<span className="mt-1 block text-sm font-normal text-slate-600">Mark the course ready for editorial review.</span></button><button type="button" disabled={isPending} onClick={() => finish("PUBLISH")} className="rounded-xl border border-blue-700 bg-blue-700 p-5 text-left font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Publish now<span className="mt-1 block text-sm font-normal text-blue-100">Make it available according to display and access settings.</span></button><button type="button" disabled={isPending} onClick={() => setPublication("SCHEDULE")} className={`rounded-xl border p-5 text-left font-semibold disabled:opacity-50 ${publication === "SCHEDULE" ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:bg-slate-50"}`}>Schedule publication<span className="mt-1 block text-sm font-normal text-slate-600">Choose a future time below.</span></button></div>{publication === "SCHEDULE" ? <div className="flex flex-wrap items-end gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><label className="text-sm font-medium">Publication date and time<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><button type="button" disabled={isPending} onClick={() => finish("SCHEDULE")} className="rounded-lg border border-amber-500 px-4 py-2 text-sm font-semibold hover:bg-amber-100 disabled:opacity-50">Schedule</button></div> : null}{course ? <div className="flex flex-wrap gap-3"><Link href={`/cms/courses/${course.id}`} className="text-sm font-semibold text-blue-700 hover:underline">Open detailed course editor</Link><Link href={`/cms/preview/courses/${course.id}`} className="text-sm font-semibold text-blue-700 hover:underline">Open preview</Link></div> : null}</section> : null}

    <footer className="flex items-center justify-between gap-3"><button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || isPending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50">Back</button>{step < steps.length - 1 ? <button type="button" onClick={next} disabled={isPending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{isPending ? "Saving…" : step === 1 ? "Create draft and continue" : "Continue"}</button> : null}</footer>
  </section>;
}
