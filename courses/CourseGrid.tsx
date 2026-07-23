import React from "react";
import CourseCard from "./CourseCard";

export interface CourseGridProps {
  courses: Array<{
    id: string;
    title: string;
    description: string;
    level?: string;
    duration?: string;
  }>;
}

export default function CourseGrid({ courses }: CourseGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} {...course} />
      ))}
    </div>
  );
}
