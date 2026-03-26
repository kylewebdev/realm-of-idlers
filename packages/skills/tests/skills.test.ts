import { describe, expect, it } from "vite-plus/test";
import { SKILLS, getSkill } from "../src/skills.js";

const VALID_CATEGORIES = ["gathering", "production", "combat"];

describe("skill definitions", () => {
  it("defines all 8 skills", () => {
    expect(Object.keys(SKILLS)).toHaveLength(8);
  });

  it("all skills have valid categories", () => {
    for (const skill of Object.values(SKILLS)) {
      expect(VALID_CATEGORIES).toContain(skill.category);
    }
  });

  it("each skill has at least one milestone", () => {
    for (const skill of Object.values(SKILLS)) {
      expect(skill.milestones.length).toBeGreaterThan(0);
    }
  });

  it("milestones are ordered by level", () => {
    for (const skill of Object.values(SKILLS)) {
      for (let i = 1; i < skill.milestones.length; i++) {
        expect(skill.milestones[i]!.level).toBeGreaterThanOrEqual(skill.milestones[i - 1]!.level);
      }
    }
  });

  it("has 3 gathering, 2 production, 3 combat skills", () => {
    const categories = Object.values(SKILLS).map((s) => s.category);
    expect(categories.filter((c) => c === "gathering")).toHaveLength(3);
    expect(categories.filter((c) => c === "production")).toHaveLength(2);
    expect(categories.filter((c) => c === "combat")).toHaveLength(3);
  });

  it("getSkill returns correct skill", () => {
    const wc = getSkill("woodcutting");
    expect(wc.name).toBe("Woodcutting");
    expect(wc.category).toBe("gathering");
  });
});
