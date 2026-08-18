"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Edit3, Eye, FolderPlus, Layers3, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import styles from "./CmsLevelsWorkspace.module.css";

type CurriculumNode = { id: string; title: string; type: "SECTION" | "TOPIC" | "SUBTOPIC"; contentStatus: string; parent: { title: string } | null };
type Course = { id: string; contentStatus: string; modules: Array<{ id: string; lessons: Array<{ id: string }> }> };

export type CmsLevelRow = {
  id: string;
  code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  title: string;
  description: string;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  order: number;
  isPublished: boolean;
  contentStatus: string;
  _count: { courses: number; curriculumNodes: number };
  courses: Course[];
  curriculumNodes: CurriculumNode[];
};

function countType(level: CmsLevelRow, type: CurriculumNode["type"]) {
  return level.curriculumNodes.filter((node) => node.type === type).length;
}

function contentCounts(level: CmsLevelRow) {
  const modules = level.courses.reduce((total, course) => total + course.modules.length, 0);
  const lessons = level.courses.reduce((total, course) => total + course.modules.reduce((moduleTotal, module) => moduleTotal + module.lessons.length, 0), 0);
  const publishedCourses = level.courses.filter((course) => course.contentStatus === "PUBLISHED").length;
  return { modules, lessons, publishedCourses };
}

function completeness(level: CmsLevelRow) {
  const missing: string[] = [];
  if (!level.description.trim()) missing.push("description");
  if (!level.coverImage) missing.push("cover");
  if (!level.seoTitle) missing.push("SEO title");
  if (!level.seoDescription) missing.push("SEO description");
  if (!countType(level, "SECTION")) missing.push("first section");
  if (!level.courses.length) missing.push("course");
  const { modules, lessons } = contentCounts(level);
  if (level.courses.length > 0 && modules === 0) missing.push("module");
  if (modules > 0 && lessons === 0) missing.push("lesson");
  return missing;
}

function statusClass(status: string) {
  if (status === "PUBLISHED") return styles.statusPublished;
  if (status === "ARCHIVED") return styles.statusArchived;
  if (status === "REVIEW" || status === "SCHEDULED") return styles.statusReview;
  return styles.statusDraft;
}

export function CmsLevelsWorkspace({ initialLevels }: { initialLevels: CmsLevelRow[] }) {
  const router = useRouter();
  const [levels, setLevels] = useState(initialLevels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => setLevels(initialLevels), [initialLevels]);
  const orderedLevels = useMemo(() => [...levels].sort((left, right) => left.order - right.order), [levels]);
  const totalCourses = levels.reduce((total, level) => total + level._count.courses, 0);
  const totalNodes = levels.reduce((total, level) => total + level._count.curriculumNodes, 0);
  const publishedLevels = levels.filter((level) => level.contentStatus === "PUBLISHED").length;

  function move(level: CmsLevelRow, direction: -1 | 1) {
    const index = orderedLevels.findIndex((item) => item.id === level.id);
    const target = index + direction;
    if (target < 0 || target >= orderedLevels.length) return;
    const next = [...orderedLevels];
    [next[index], next[target]] = [next[target], next[index]];
    const orderedIds = next.map((item) => item.id);
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/cms/content/LANGUAGE_LEVEL/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) { setMessage({ text: payload.error ?? "Unable to change the level order.", error: true }); return; }
      setLevels(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })));
      setMessage({ text: "Level order saved." });
      router.refresh();
    });
  }

  function save(event: FormEvent<HTMLFormElement>, level: CmsLevelRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/levels/${level.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), coverImage: form.get("coverImage"), seoTitle: form.get("seoTitle"), seoDescription: form.get("seoDescription"), seoKeywords: form.get("seoKeywords") }) });
      const payload = await response.json() as { error?: string; data?: Partial<CmsLevelRow> };
      if (!response.ok || !payload.data) { setMessage({ text: payload.error ?? "Unable to save level details.", error: true }); return; }
      setLevels((current) => current.map((item) => item.id === level.id ? { ...item, ...payload.data } : item));
      setEditingId(null);
      setMessage({ text: `${level.code} details saved.` });
      router.refresh();
    });
  }

  return <section className={styles.workspace} aria-busy={isPending}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>Curriculum</p><h1>CEFR levels A1-C2</h1><p>Levels are the starting point for your course structure. Add a section first, then topics, and only your current editorial work appears here.</p></div><Link href="/cms/courses/new" className={styles.createButton}><Plus size={17} aria-hidden="true" /> Create course</Link></header>
    <section className={styles.summary} aria-label="Level overview"><article><span>CEFR levels</span><strong>{levels.length}</strong></article><article><span>Published levels</span><strong>{publishedLevels}</strong></article><article><span>Courses</span><strong>{totalCourses}</strong></article><article><span>Current curriculum items</span><strong>{totalNodes}</strong></article></section>
    {message ? <p role="status" className={`${styles.message} ${message.error ? styles.messageError : ""}`}>{message.text}</p> : null}
    <section className={styles.levelGrid} aria-label="CEFR levels">{orderedLevels.map((level, index) => {
      const { modules, lessons, publishedCourses } = contentCounts(level);
      const sections = level.curriculumNodes.filter((node) => node.type === "SECTION");
      const topics = level.curriculumNodes.filter((node) => node.type === "TOPIC");
      const missing = completeness(level);
      const isEditing = editingId === level.id;
      return <article key={level.id} className={styles.levelCard}>
        <div className={styles.cardHero} style={level.coverImage ? { backgroundImage: `linear-gradient(135deg, rgb(16 31 58 / 90%), rgb(40 65 118 / 75%)), url(${level.coverImage})` } : undefined}><div><span className={styles.code}>CEFR {level.code}</span><h2>{level.title}</h2></div><span className={`${styles.statusTag} ${statusClass(level.contentStatus)}`}>{level.contentStatus}</span></div>
        <div className={styles.cardContent}>
          <p className={styles.description}>{level.description}</p>
          <dl className={styles.metrics}><div><dt>Courses</dt><dd>{level._count.courses}<small>{publishedCourses} published</small></dd></div><div><dt>Learning units</dt><dd>{modules}<small>{lessons} lessons</small></dd></div><div><dt>Display</dt><dd>{level.isPublished ? "Visible" : "Hidden"}<small>public level page</small></dd></div></dl>
          <section className={styles.curriculumPreview}><div className={styles.previewHeading}><div><span>Curriculum</span><strong>{level._count.curriculumNodes ? `${level._count.curriculumNodes} current item${level._count.curriculumNodes === 1 ? "" : "s"}` : "Not started"}</strong></div><Link href={`/cms/sections?level=${level.code}`} aria-label={`Manage ${level.code} curriculum`}><FolderPlus size={15} aria-hidden="true" /> Manage</Link></div>{level._count.curriculumNodes ? <div className={styles.nodeList}>{sections.slice(0, 2).map((section) => <span key={section.id} className={styles.sectionChip}>{section.title}</span>)}{topics.slice(0, 2).map((topic) => <span key={topic.id} className={styles.topicChip}>{topic.parent ? `${topic.parent.title}: ` : ""}{topic.title}</span>)}{level._count.curriculumNodes > 4 ? <span className={styles.moreChip}>+{level._count.curriculumNodes - 4} more</span> : null}</div> : <p>Start with a section. Topics will appear under their selected section as you add them.</p>}</section>
          <p className={`${styles.completeness} ${missing.length ? styles.needsWork : styles.ready}`}>{missing.length ? `Next: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}` : "Ready for publication"}</p>
          <div className={styles.links}><Link href={`/cms/courses?level=${level.code}`}><Layers3 size={15} aria-hidden="true" /> Courses</Link><Link href={`/cms/sections?level=${level.code}`}><FolderPlus size={15} aria-hidden="true" /> Add section</Link><Link href={`/cms/courses/new?level=${level.code}`} className={styles.primaryLink}><Plus size={15} aria-hidden="true" /> Add course</Link><Link href={`/cms/preview/levels/${level.code.toLowerCase()}`}><Eye size={15} aria-hidden="true" /> Preview</Link></div>
          <div className={styles.management}><button type="button" onClick={() => move(level, -1)} disabled={isPending || index === 0} aria-label={`Move ${level.code} up`}><ArrowUp size={15} aria-hidden="true" /> Move up</button><button type="button" onClick={() => move(level, 1)} disabled={isPending || index === orderedLevels.length - 1} aria-label={`Move ${level.code} down`}><ArrowDown size={15} aria-hidden="true" /> Move down</button><button type="button" onClick={() => setEditingId(isEditing ? null : level.id)} aria-expanded={isEditing}><Edit3 size={15} aria-hidden="true" /> {isEditing ? "Close editor" : "Edit details"}</button></div>
          <div className={styles.lifecycle}><CmsLifecycleControls entityType="LANGUAGE_LEVEL" entityId={level.id} status={level.contentStatus} compact /></div>
          {isEditing ? <form onSubmit={(event) => save(event, level)} className={styles.editor}><div><p>Edit {level.code}</p><span>The CEFR code is fixed.</span></div><label>Title<input name="title" required minLength={2} maxLength={80} defaultValue={level.title} /></label><label>Description<textarea name="description" required minLength={10} maxLength={1000} defaultValue={level.description} /></label><label>Cover image URL<input name="coverImage" type="url" defaultValue={level.coverImage ?? ""} placeholder="https://example.com/cover.jpg" /></label><details><summary>SEO metadata</summary><div><label>SEO title<input name="seoTitle" maxLength={70} defaultValue={level.seoTitle ?? ""} /></label><label>SEO description<textarea name="seoDescription" maxLength={160} defaultValue={level.seoDescription ?? ""} /></label><label>SEO keywords<input name="seoKeywords" maxLength={500} defaultValue={level.seoKeywords ?? ""} placeholder="English, A1, beginner" /></label></div></details><div className={styles.editorActions}><button type="submit" disabled={isPending} className={styles.saveButton}>{isPending ? "Saving..." : "Save level"}</button><button type="button" disabled={isPending} onClick={() => setEditingId(null)}>Cancel</button></div></form> : null}
        </div>
      </article>;
    })}</section>
  </section>;
}
