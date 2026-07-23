import { create } from 'zustand';

interface AIState {
  prompt: string;
  setPrompt: (prompt: string) => void;
  clearPrompt: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  prompt: '',
  setPrompt: (prompt) => set({ prompt }),
  clearPrompt: () => set({ prompt: '' }),
}));
