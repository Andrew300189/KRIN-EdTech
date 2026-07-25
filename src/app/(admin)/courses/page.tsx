"use client";

import { FormEvent, useState } from "react";

export default function AdminCoursesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("beginner");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
          "x-user-id": "admin-panel-user",
        },
        body: JSON.stringify({ title, description, level }),
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
