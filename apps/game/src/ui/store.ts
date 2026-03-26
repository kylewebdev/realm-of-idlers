import { createStore } from "zustand/vanilla";
import type { SkillType } from "@realm-of-idlers/shared";

export interface UIState {
  panels: { skills: boolean; inventory: boolean; action: boolean };
  activeModal: string | null;
  selectedSkill: SkillType | null;
  eventLog: string[];
}

export interface UIActions {
  togglePanel: (panel: keyof UIState["panels"]) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  selectSkill: (skill: SkillType) => void;
  pushEvent: (msg: string) => void;
}

export type UIStore = UIState & UIActions;

const MAX_LOG_ENTRIES = 50;

export const uiStore = createStore<UIStore>((set) => ({
  panels: { skills: true, inventory: true, action: true },
  activeModal: null,
  selectedSkill: null,
  eventLog: [],

  togglePanel: (panel) =>
    set((s) => ({
      panels: { ...s.panels, [panel]: !s.panels[panel] },
    })),

  openModal: (id) => set({ activeModal: id }),

  closeModal: () => set({ activeModal: null, selectedSkill: null }),

  selectSkill: (skill) => set({ selectedSkill: skill, activeModal: "skill-detail" }),

  pushEvent: (msg) =>
    set((s) => ({
      eventLog: [...s.eventLog.slice(-(MAX_LOG_ENTRIES - 1)), msg],
    })),
}));
