import type { SkillType } from "@realm-of-idlers/shared";
import type { TickContext, GatherActivityDef, CraftActivityDef } from "@realm-of-idlers/engine";
import { GATHER_ACTIVITIES, CRAFT_ACTIVITIES } from "./activities.js";

/** Create a fully populated TickContext for the engine. */
export function createTickContext(): TickContext {
  return {
    activities: {
      gather: GATHER_ACTIVITIES,
      craft: CRAFT_ACTIVITIES,
    },
  };
}

/** Get all activities (gather + craft) for a given skill. */
export function getActivitiesForSkill(skill: SkillType): (GatherActivityDef | CraftActivityDef)[] {
  const results: (GatherActivityDef | CraftActivityDef)[] = [];
  for (const def of Object.values(GATHER_ACTIVITIES)) {
    if (def.skill === skill) results.push(def);
  }
  for (const def of Object.values(CRAFT_ACTIVITIES)) {
    if (def.skill === skill) results.push(def);
  }
  return results;
}

/** Get activities available at a given skill level. */
export function getAvailableActivities(
  skill: SkillType,
  level: number,
): (GatherActivityDef | CraftActivityDef)[] {
  return getActivitiesForSkill(skill).filter((def) => def.levelRequired <= level);
}
