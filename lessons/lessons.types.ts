export interface Lesson {
  id: string;
  title: string;
  type: 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'speaking' | 'writing' | 'quiz' | 'homework';
  content?: string;
  prompt?: string;
  questions?: string[];
  words?: string[];
  audioUrl?: string;
  completed?: boolean;
}
