import type { GameState } from "@realm-of-idlers/shared";
import { countItem } from "@realm-of-idlers/items";
import type { QuestDef, QuestObjective } from "./types.js";

export interface QuestUpdate {
  questId: string;
  completed: boolean;
  objectiveUpdates: { objectiveId: string; current: number; target: number }[];
}

/**
 * Check quest progress for all active quests.
 * Returns updates for any quests whose objective progress changed.
 */
export function checkQuestProgress(
  state: GameState,
  quests: Record<string, QuestDef>,
): QuestUpdate[] {
  const updates: QuestUpdate[] = [];

  for (const [questId, quest] of Object.entries(quests)) {
    if (state.quests[questId] !== "active") continue;

    const objectiveUpdates: QuestUpdate["objectiveUpdates"] = [];
    let allComplete = true;

    for (const obj of quest.objectives) {
      const current = getObjectiveProgress(state, questId, obj);
      const target = getObjectiveTarget(obj);
      objectiveUpdates.push({ objectiveId: obj.objectiveId, current, target });
      if (current < target) allComplete = false;
    }

    updates.push({ questId, completed: allComplete, objectiveUpdates });
  }

  return updates;
}

/**
 * Check which quests are available (prerequisites met, not yet started).
 */
export function getAvailableQuests(state: GameState, quests: Record<string, QuestDef>): QuestDef[] {
  return Object.values(quests).filter((quest) => {
    if (state.quests[quest.id]) return false; // already started or complete
    return quest.prerequisites.every((prereq) => state.quests[prereq] === "complete");
  });
}

function getObjectiveProgress(state: GameState, questId: string, obj: QuestObjective): number {
  switch (obj.type) {
    case "gather":
      return countItem(state.inventory, obj.itemId);
    case "craft":
      return state.questProgress[questId]?.[obj.objectiveId] ?? 0;
    case "kill":
      return state.killCounts[obj.monsterId] ?? 0;
    case "skill":
      return state.skills[obj.skill]?.level ?? 0;
    case "talk":
      return state.questProgress[questId]?.[obj.objectiveId] ?? 0;
  }
}

function getObjectiveTarget(obj: QuestObjective): number {
  switch (obj.type) {
    case "gather":
      return obj.qty;
    case "craft":
      return obj.qty;
    case "kill":
      return obj.qty;
    case "skill":
      return obj.level;
    case "talk":
      return 1;
  }
}
