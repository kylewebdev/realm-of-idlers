import { describe, expect, it } from "vite-plus/test";
import {
  createTickContext,
  getActivitiesForSkill,
  getAvailableActivities,
} from "../src/context.js";

describe("createTickContext", () => {
  it("returns a valid TickContext with all activities", () => {
    const ctx = createTickContext();

    expect(Object.keys(ctx.activities.gather).length).toBeGreaterThan(0);
    expect(Object.keys(ctx.activities.craft).length).toBeGreaterThan(0);
  });

  it("gather registry contains chop-normal-tree", () => {
    const ctx = createTickContext();
    expect(ctx.activities.gather["chop-normal-tree"]).toBeDefined();
  });

  it("craft registry contains smelt-bronze", () => {
    const ctx = createTickContext();
    expect(ctx.activities.craft["smelt-bronze"]).toBeDefined();
  });
});

describe("getActivitiesForSkill", () => {
  it("returns woodcutting activities", () => {
    const activities = getActivitiesForSkill("woodcutting");
    expect(activities).toHaveLength(2);
    const ids = activities.map((a) => a.id);
    expect(ids).toContain("chop-normal-tree");
    expect(ids).toContain("chop-oak-tree");
  });

  it("returns smithing activities (gather + craft)", () => {
    const activities = getActivitiesForSkill("smithing");
    // smelt-bronze, smelt-iron, smith-bronze-dagger, smith-iron-dagger
    expect(activities).toHaveLength(4);
  });

  it("returns empty for combat skills (no activities yet)", () => {
    expect(getActivitiesForSkill("attack")).toHaveLength(0);
    expect(getActivitiesForSkill("strength")).toHaveLength(0);
    expect(getActivitiesForSkill("hitpoints")).toHaveLength(0);
  });
});

describe("getAvailableActivities", () => {
  it("filters by level requirement", () => {
    const level1 = getAvailableActivities("woodcutting", 1);
    expect(level1).toHaveLength(1);
    expect(level1[0]!.id).toBe("chop-normal-tree");

    const level15 = getAvailableActivities("woodcutting", 15);
    expect(level15).toHaveLength(2);
  });

  it("fishing trout requires level 20", () => {
    const level19 = getAvailableActivities("fishing", 19);
    expect(level19.map((a) => a.id)).not.toContain("fish-trout");

    const level20 = getAvailableActivities("fishing", 20);
    expect(level20.map((a) => a.id)).toContain("fish-trout");
  });
});
