import { enableMapSet } from "immer";
import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import type { ActionEntry, NodeId, QuestId, SkillType } from "@realm-of-idlers/shared";
import type { GameState, QuestStatus } from "./types.js";
import { createNewGameState } from "./factory.js";
import { levelForXp } from "./xp-table.js";

// Required for Immer to handle Set<string> in world.exploredTiles
enableMapSet();

export interface GameActions {
  /** Replace entire state (used when loading a save). */
  loadState: (state: GameState) => void;

  /** Add XP to a skill, auto-leveling if threshold is crossed. */
  addXp: (skill: SkillType, amount: number) => void;

  /** Set the current action. */
  setAction: (action: ActionEntry) => void;

  /** Partially update player fields. */
  updatePlayer: (partial: Partial<GameState["player"]>) => void;

  /** Update timestamps. */
  updateTimestamps: (partial: Partial<GameState["timestamps"]>) => void;

  /** Mark a tile as explored. */
  addExploredTile: (key: string) => void;

  /** Update a resource node's state. */
  updateResourceNode: (nodeId: NodeId, update: { depleted: boolean; respawnAt: number }) => void;

  /** Set a quest's status. */
  setQuestStatus: (questId: QuestId, status: QuestStatus) => void;

  /** Update quest objective progress. */
  updateQuestProgress: (questId: QuestId, objectiveId: string, count: number) => void;

  /** Increment a monster kill count. */
  incrementKillCount: (monsterId: string) => void;
}

export type GameStore = GameState & GameActions;

export const createGameStore = (playerName = "Player") =>
  createStore<GameStore>()(
    immer((set) => ({
      ...createNewGameState(playerName),

      loadState: (state) =>
        set(() => ({
          ...state,
        })),

      addXp: (skill, amount) =>
        set((s) => {
          const entry = s.skills[skill];
          entry.xp += amount;
          const newLevel = levelForXp(entry.xp);
          if (newLevel > entry.level) {
            entry.level = newLevel;
          }
        }),

      setAction: (action) =>
        set((s) => {
          s.actionQueue = [action];
        }),

      updatePlayer: (partial) =>
        set((s) => {
          Object.assign(s.player, partial);
        }),

      updateTimestamps: (partial) =>
        set((s) => {
          Object.assign(s.timestamps, partial);
        }),

      addExploredTile: (key) =>
        set((s) => {
          s.world.exploredTiles.add(key);
        }),

      updateResourceNode: (nodeId, update) =>
        set((s) => {
          s.world.resourceNodes[nodeId] = update;
        }),

      setQuestStatus: (questId, status) =>
        set((s) => {
          s.quests[questId] = status;
        }),

      updateQuestProgress: (questId, objectiveId, count) =>
        set((s) => {
          if (!s.questProgress[questId]) {
            s.questProgress[questId] = {};
          }
          s.questProgress[questId][objectiveId] = count;
        }),

      incrementKillCount: (monsterId) =>
        set((s) => {
          s.killCounts[monsterId] = (s.killCounts[monsterId] ?? 0) + 1;
        }),
    })),
  );

/** Default singleton store instance. */
export const gameStore = createGameStore();
