"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistEntry {
  id: string;
  name: string;
  team?: string;
  addedAt: number;
}

interface WatchlistState {
  items: WatchlistEntry[];
  toggle: (entry: Omit<WatchlistEntry, "addedAt">) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (entry) => {
        const items = get().items;
        if (items.some((i) => i.id === entry.id)) {
          set({ items: items.filter((i) => i.id !== entry.id) });
        } else {
          set({
            items: [{ ...entry, addedAt: Date.now() }, ...items].slice(0, 30),
          });
        }
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      has: (id) => get().items.some((i) => i.id === id),
    }),
    { name: "courtsight-watchlist" },
  ),
);
