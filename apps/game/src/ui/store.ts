import { createStore } from "zustand/vanilla";
import type { SkillType } from "@realm-of-idlers/shared";

export type TabId = "inventory" | "skills" | "equipment";

export interface UIState {
  activeTab: TabId;
  activeModal: string | null;
  selectedSkill: SkillType | null;
  eventLog: string[];
}

export interface UIActions {
  setTab: (tab: TabId) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  selectSkill: (skill: SkillType) => void;
  pushEvent: (msg: string) => void;
}

export type UIStore = UIState & UIActions;

const MAX_LOG_ENTRIES = 50;

export const uiStore = createStore<UIStore>((set) => ({
  activeTab: "inventory",
  activeModal: null,
  selectedSkill: null,
  eventLog: [],

  setTab: (tab) => set({ activeTab: tab }),

  openModal: (id) => set({ activeModal: id }),

  closeModal: () => set({ activeModal: null, selectedSkill: null }),

  selectSkill: (skill) => set({ selectedSkill: skill, activeModal: "skill-detail" }),

  pushEvent: (msg) =>
    set((s) => ({
      eventLog: [...s.eventLog.slice(-(MAX_LOG_ENTRIES - 1)), msg],
    })),
}));
