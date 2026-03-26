import type { QuestId, SkillType } from "@realm-of-idlers/shared";

export type QuestObjective =
  | { type: "gather"; objectiveId: string; itemId: string; qty: number }
  | { type: "craft"; objectiveId: string; itemId: string; qty: number }
  | { type: "kill"; objectiveId: string; monsterId: string; qty: number }
  | { type: "skill"; objectiveId: string; skill: SkillType; level: number }
  | { type: "talk"; objectiveId: string; npcId: string };

export type QuestReward =
  | { type: "item"; itemId: string; qty: number }
  | { type: "xp"; skill: SkillType; amount: number }
  | { type: "gold"; amount: number };

export interface QuestDef {
  id: QuestId;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: QuestId[];
}
