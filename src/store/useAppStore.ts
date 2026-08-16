import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  unreadCount: number;
  lastActiveSessionId: string | null;
  favoritePsychicIds: string[];
  setUnreadCount: (count: number) => void;
  setLastActiveSessionId: (id: string | null) => void;
  toggleFavoritePsychic: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      lastActiveSessionId: null,
      favoritePsychicIds: [],
      setUnreadCount: (count) => set({ unreadCount: count }),
      setLastActiveSessionId: (id) => set({ lastActiveSessionId: id }),
      toggleFavoritePsychic: (id) =>
        set((state) => ({
          favoritePsychicIds: state.favoritePsychicIds.includes(id)
            ? state.favoritePsychicIds.filter((pId) => pId !== id)
            : [...state.favoritePsychicIds, id],
        })),
    }),
    {
      name: 'sixth-sense-client-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
