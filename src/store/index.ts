import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Settings, Submission } from "@/types";

// —— 菜谱清单（当前用户挑了哪些菜谱） ——
type MenuCartState = {
  selected: string[];
  toggle: (id: string) => void;
  addMany: (ids: string[]) => void;
  has: (id: string) => boolean;
  setAll: (ids: string[]) => void;
  clear: () => void;
  size: () => number;
};

export const useMenuCart = create<MenuCartState>()(
  persist(
    (set, get) => ({
      selected: [],
      toggle: (id) =>
        set((state) => {
          if (state.selected.includes(id)) {
            return { selected: state.selected.filter((x) => x !== id) };
          }
          return { selected: [...state.selected, id] };
        }),
      addMany: (ids) =>
        set((state) => {
          const merged = new Set([...state.selected, ...ids]);
          return { selected: Array.from(merged) };
        }),
      has: (id) => get().selected.includes(id),
      setAll: (ids) => set({ selected: Array.from(new Set(ids)) }),
      clear: () => set({ selected: [] }),
      size: () => get().selected.length,
    }),
    { name: "qx-menu-cart" },
  ),
);

// —— 最近一次提交（仅内存） ——
type SubmissionState = {
  submission: Submission | null;
  setSubmission: (s: Submission) => void;
  clearSubmission: () => void;
};

export const useLastSubmission = create<SubmissionState>((set) => ({
  submission: null,
  setSubmission: (submission) => set({ submission }),
  clearSubmission: () => set({ submission: null }),
}));

// —— 设置项（持久化） ——
const DEFAULT_SETTINGS: Settings = {
  to_email: "",
  subject_prefix: "【轻享点餐】采购清单",
  emailjs: null,
};

type SettingsState = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      update: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: "qx-settings" },
  ),
);
