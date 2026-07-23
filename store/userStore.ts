import { create } from 'zustand';

interface UserState {
  name: string;
  email: string;
  setUser: (user: { name: string; email: string }) => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: 'Guest',
  email: 'guest@example.com',
  setUser: (user) => set(user),
}));
