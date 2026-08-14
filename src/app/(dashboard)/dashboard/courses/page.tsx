"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type LearnerCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  category: string;
  accessPlan: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  source:
    | "ENROLLED"
    | "PURCHASED"
    | "SUBSCRIPTION"
    | "IN_PROGRESS"
    | "TEACHER_CREATED"
    | "SELF_ADDED"
    | "TEACHER_ASSIGNED"
    | "GROUP_ASSIGNED";
  nextLesson: { slug: string; title: string } | null;
};

const SOURCE_LABEL: Record<LearnerCourse["source"], string> = {
  ENROLLED: "Enrolled",
  PURCHASED: "Purchased access",
  SUBSCRIPTION: "Included in your subscription",
  IN_PROGRESS: "Started course",
  TEACHER_CREATED: "Created by you",
  SELF_ADDED: "Added to your library",
  TEACHER_ASSIGNED: "Assigned by your teacher",
  GROUP_ASSIGNED: "Assigned to your group",
};

export default function DashboardCoursesPage() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<LearnerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestedStage = (searchParams.get("stage") || "").trim().toUpperCase();
  const requestedCourse = (searchParams.get("course") || "")
    .trim()
    .toLowerCase();

  const stageFilter =
    requestedStage === "A1" ||
    requestedStage === "A2" ||
    requestedStage === "B1" ||
    requestedStage === "B2" ||
    requestedStage === "C1" ||
    requestedStage === "C2"
      ? requestedStage
      : null;

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/courses", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load your courses.");
      }
      setCourses(Array.isArray(payload?.data) ? payload.data : []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load your courses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const stageCourses = stageFilter
    ? courses.filter((course) => course.level.toUpperCase() === stageFilter)
    : courses;

  const exactCourseMatch = requestedCourse
    ? stageCourses.find(
        (course) => course.slug.toLowerCase() === requestedCourse,
      )
    : null;

  const fuzzyCourseMatches = requestedCourse
    ? stageCourses.filter((course) => {
        const slug = course.slug.toLowerCase();
        const title = course.title.toLowerCase();
        return (
          slug.includes(requestedCourse) ||
          requestedCourse.includes(slug) ||
          title.includes(requestedCourse.replace(/-/g, " "))
        );
      })
    : stageCourses;

  const visibleCourses = exactCourseMatch
    ? [exactCourseMatch]
    : requestedCourse
      ? fuzzyCourseMatches.length > 0
        ? fuzzyCourseMatches
        : stageCourses
      : stageCourses;

  const hasCourseFallback = Boolean(
    requestedCourse && !exactCourseMatch && fuzzyCourseMatches.length === 0,
  );

  if (loading) {
    return (
      <section aria-busy="true" className="space-y-4">
        <div className="h-9 w-44 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-56 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <h2 className="text-xl font-bold">Courses could not be loaded</h2>
        <p className="mt-2 text-sm">{error}</p>
        <button
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          onClick={() => void loadCourses()}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Learning
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          {stageFilter ? `${stageFilter} courses` : "My Courses"}
        </h2>
        <p className="mt-2 text-slate-600">
          {stageFilter
            ? `Showing your available courses for level ${stageFilter}.`
            : "Courses you enrolled in, purchased, started, or can access through an active subscription."}
        </p>
        {hasCourseFallback ? (
          <p className="mt-2 text-sm text-amber-700">
            Requested course was not found in your library. Showing all
            available {stageFilter} courses instead.
          </p>
        ) : null}
      </header>

      {visibleCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-xl font-semibold text-slate-900">
            {stageFilter
              ? `No ${stageFilter} courses in your learning space yet`
              : "No courses in your learning space yet"}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Browse the catalog to start a free lesson, or visit Academies to
            explore structured learning paths.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={stageFilter ? `/courses?level=${stageFilter}` : "/courses"}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Browse catalog
            </Link>
            <Link
              href="/dashboard/academies"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Explore academies
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => (
            <article
              key={course.id}
              className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
                  {course.level}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {course.category}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                {course.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">
                {course.description}
              </p>
              <p className="mt-4 text-xs font-medium text-slate-500">
                {SOURCE_LABEL[course.source]}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                aria-label={`${course.progress}% complete`}
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {course.progress}% complete · {course.completedLessons}/
                {course.totalLessons} lessons
              </p>
              <Link
                href={`/courses/${course.slug}`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {course.nextLesson ? "Continue course" : "View course"}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
