import { create } from "zustand";
import { queryClient } from "./trpc";

type User = {
  id: string;
  email?: string;
};

type State = {
  user: User | null;
};

type Actions = {
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const userStore = create<State & Actions>((set, get) => ({
  user: null,
  setUser: (user) => {
    if (get().user?.id !== user?.id) queryClient.clear();
    set({ user });
  },
  logout: () => {
    queryClient.clear();
    set({ user: null });
  },
}));
