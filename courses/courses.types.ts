export interface Course {
  id: string;
  title: string;
  description: string;
  level?: string;
  duration?: string;
  objectives?: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons?: number;
}

export interface Lesson {
  id: string;
  title: string;
  duration?: string;
  completed?: boolean;
}
