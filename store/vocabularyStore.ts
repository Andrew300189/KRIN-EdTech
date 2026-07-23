import { create } from 'zustand';

interface VocabularyState {
  words: string[];
  addWord: (word: string) => void;
  removeWord: (word: string) => void;
}

export const useVocabularyStore = create<VocabularyState>((set) => ({
  words: [],
  addWord: (word) => set((state) => ({ words: state.words.includes(word) ? state.words : [...state.words, word] })),
  removeWord: (word) => set((state) => ({ words: state.words.filter((item) => item !== word) })),
}));
