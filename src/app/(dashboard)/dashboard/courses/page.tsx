"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type AcademyPath = {
  slug: string;
  title: string;
};

type Academy = {
  slug: string;
  title: string;
  paths: AcademyPath[];
};

type CourseCardItem = {
  id: string;
  title: string;
  academy: string;
  path: string;
  stage: string;
  level: string;
  progress: number;
};

export default function CoursesPage() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<CourseCardItem[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [selectedAcademy, setSelectedAcademy] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const didInitFromQuery = useRef(false);

  useEffect(() => {
    async function loadCatalog() {
      const response = await fetch("/api/courses");
      const payload = await response.json();

      if (!response.ok) return;

      setCourses(payload.data ?? []);
      setAcademies(payload.catalog?.academies ?? []);
      setStages(payload.catalog?.stages ?? []);
    }

    void loadCatalog();
  }, []);

  useEffect(() => {
    if (didInitFromQuery.current || stages.length === 0 || academies.length === 0) {
      return;
    }

    const academyParam = searchParams.get("academy")?.toLowerCase();
    if (academyParam && academies.some((academy) => academy.slug === academyParam)) {
      setSelectedAcademy(academyParam);
    }

    const stageParam = searchParams.get("stage")?.toLowerCase();
    if (stageParam && stages.includes(stageParam)) {
      setSelectedStage(stageParam);
    }

    didInitFromQuery.current = true;
  }, [academies, searchParams, stages]);

  const academyTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    academies.forEach((academy) => {
      map.set(academy.slug, academy.title);
    });
    return map;
  }, [academies]);

  const pathTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    academies.forEach((academy) => {
      academy.paths.forEach((path) => {
        map.set(`${academy.slug}:${path.slug}`, path.title);
      });
    });
    return map;
  }, [academies]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const academyPass =
        selectedAcademy === "all" || course.academy === selectedAcademy;
      const stagePass =
        selectedStage === "all" ||
        course.stage === selectedStage ||
        selectedStage === "all-levels";
      return academyPass && stagePass;
    });
  }, [courses, selectedAcademy, selectedStage]);

  const groupedByAcademy = useMemo(() => {
    return filteredCourses.reduce<Record<string, CourseCardItem[]>>(
      (acc, course) => {
        if (!acc[course.academy]) {
          acc[course.academy] = [];
        }
        acc[course.academy].push(course);
        return acc;
      },
      {},
    );
  }, [filteredCourses]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Learning Paths</h2>
        <p className="text-gray-600">
          Explore courses by academy, path, and stage. Build your own
          personalized route.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          className="w-full border rounded px-3 py-2 bg-white"
          value={selectedAcademy}
          onChange={(e) => setSelectedAcademy(e.target.value)}
        >
          <option value="all">All academies</option>
          {academies.map((academy) => (
            <option key={academy.slug} value={academy.slug}>
              {academy.title}
            </option>
          ))}
        </select>

        <select
          className="w-full border rounded px-3 py-2 bg-white"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
        >
          <option value="all">All stages</option>
          {stages.map((stage) => (
            <option key={stage} value={stage}>
              {stage.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedByAcademy).length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-600">No personal courses are available yet.</p>
            <Link href="/courses" className="mt-4 inline-block text-sm font-semibold text-blue-700 underline underline-offset-4">
              Browse the English course catalog
            </Link>
          </div>
        )}
        {Object.entries(groupedByAcademy).map(
          ([academySlug, academyCourses]) => (
            <section key={academySlug} className="space-y-3">
              <h3 className="text-xl font-semibold">
                {academyTitleMap.get(academySlug) ?? academySlug}
              </h3>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {academyCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white p-6 rounded-lg shadow-sm border border-slate-100"
                  >
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div>
                        <h4 className="text-lg font-semibold leading-snug">
                          {course.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {pathTitleMap.get(
                            `${course.academy}:${course.path}`,
                          ) ?? course.path}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {course.stage.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-3">{course.level}</p>

                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {course.progress}% complete
                    </p>

                    <button className="btn btn-primary btn-sm mt-4">
                      Continue
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
