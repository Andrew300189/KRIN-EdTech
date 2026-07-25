"use client";

import { FormEvent, useEffect, useState } from "react";

type TeacherCourse = {
  id: string;
  title: string;
  description: string;
  level: string;
  status: string;
  visibility: string;
  createdAt: string;
};

export default function TeacherCoursesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("beginner");
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [result, setResult] = useState("");

  async function loadCourses() {
    const response = await fetch("/api/teacher/courses", {
      headers: {
        "x-user-role": "teacher",
        "x-user-id": "teacher-demo-1",
      },
    });

    const payload = await response.json();
    if (response.ok) {
      setCourses(payload.data ?? []);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult("");

    const response = await fetch("/api/teacher/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "teacher",
        "x-user-id": "teacher-demo-1",
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
    await loadCourses();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Teacher Courses</h2>
      <p className="text-gray-600">Create private drafts and manage your courses.</p>

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow-sm p-6 space-y-4 max-w-2xl"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Course title"
          className="w-full border rounded px-3 py-2"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Course description"
          className="w-full border rounded px-3 py-2 min-h-24"
          required
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <button className="px-4 py-2 rounded bg-primary text-white" type="submit">
          Create my course
        </button>
        {result ? <p className="text-sm text-gray-700">{result}</p> : null}
      </form>

      <div className="space-y-3">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold">{course.title}</h3>
            <p className="text-sm text-gray-600">{course.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              {course.level} • {course.status} • {course.visibility}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
