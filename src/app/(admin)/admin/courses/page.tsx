"use client";

import { FormEvent, useState } from "react";
import {
  COURSE_STAGES,
  LEARNING_ACADEMIES,
} from "@/modules/courses/constants/learning-paths";

export default function AdminCoursesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("beginner");
  const [academy, setAcademy] = useState<string>(LEARNING_ACADEMIES[0].slug);
  const [path, setPath] = useState<string>(LEARNING_ACADEMIES[0].paths[0].slug);
  const [stage, setStage] = useState<string>("all-levels");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const activeAcademy =
    LEARNING_ACADEMIES.find((item) => item.slug === academy) ??
    LEARNING_ACADEMIES[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          level,
          academy,
          path,
          stage,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setResult(payload.error ?? "Failed to create course");
        return;
      }

      setResult(`Created: ${payload.data.title}`);
      setTitle("");
      setDescription("");
      setLevel("beginner");
      setStage("all-levels");
    } catch {
      setResult("Unexpected error while creating course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Admin Course Creator</h2>
      <p className="text-gray-600">
        Create and publish new courses as an administrator.
      </p>

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow-sm p-6 space-y-4 max-w-2xl"
      >
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            htmlFor="description"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 min-h-28"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="level">
            Level
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="academy">
            Academy
          </label>
          <select
            id="academy"
            value={academy}
            onChange={(e) => {
              const next = e.target.value;
              setAcademy(next);
              const nextAcademy = LEARNING_ACADEMIES.find(
                (item) => item.slug === next,
              );
              if (nextAcademy?.paths[0]) {
                setPath(nextAcademy.paths[0].slug);
              }
            }}
            className="w-full border rounded px-3 py-2"
          >
            {LEARNING_ACADEMIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="path">
            Path
          </label>
          <select
            id="path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            {activeAcademy.paths.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="stage">
            Stage
          </label>
          <select
            id="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            {COURSE_STAGES.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-primary text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Course"}
        </button>

        {result ? <p className="text-sm text-gray-700">{result}</p> : null}
      </form>
    </div>
  );
}
