import { useSyncExternalStore } from "react";

export type HomeView = "home" | "reciter" | "reading";

type UIState = {
  homeView: HomeView;
  readingSurah: number;
};

// Non-persisted global UI state (navigation between the home views, readable
// from anywhere — e.g. the global MiniPlayer).
let ui: UIState = { homeView: "home", readingSurah: 1 };
const listeners = new Set<() => void>();

export function setUI(patch: Partial<UIState>) {
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}

export function useUI<T>(sel: (s: UIState) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => sel(ui),
    () => sel(ui),
  );
}

export const getUI = () => ui;
