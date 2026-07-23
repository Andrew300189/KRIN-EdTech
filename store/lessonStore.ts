import { create } from 'zustand';

interface LessonState {
  currentLessonId: string | null;
  setCurrentLessonId: (id: string | null) => void;
}

export const useLessonStore = create<LessonState>((set) => ({
  currentLessonId: null,
  setCurrentLessonId: (id) => set({ currentLessonId: id }),
}));
