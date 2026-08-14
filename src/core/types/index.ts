// Shared application types
export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "student" | "teacher" | "admin";
  createdAt: Date;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  instructor: User;
  students: User[];
  createdAt: Date;
};

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  type:
    | "reading"
    | "listening"
    | "speaking"
    | "writing"
    | "grammar"
    | "vocabulary";
  order: number;
  createdAt: Date;
};
