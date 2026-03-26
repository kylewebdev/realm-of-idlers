import type { SkillType } from "@realm-of-idlers/shared";

export interface Milestone {
  level: number;
  description: string;
}

export interface SkillDef {
  type: SkillType;
  name: string;
  category: "gathering" | "production" | "combat" | "support";
  milestones: Milestone[];
}
