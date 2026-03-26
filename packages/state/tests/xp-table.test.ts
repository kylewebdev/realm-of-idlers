import { describe, expect, test } from "vite-plus/test";
import { levelForXp, xpForLevel, xpToNextLevel } from "../src/xp-table.js";

describe("xpForLevel", () => {
  test("level 1 requires 0 XP", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  test("level 2 requires 83 XP", () => {
    expect(xpForLevel(2)).toBe(83);
  });

  test("level 10 requires 1,154 XP", () => {
    expect(xpForLevel(10)).toBe(1154);
  });

  test("level 99 requires 13,034,431 XP", () => {
    expect(xpForLevel(99)).toBe(13034431);
  });

  test("clamped below 1", () => {
    expect(xpForLevel(0)).toBe(0);
  });

  test("clamped above 99", () => {
    expect(xpForLevel(100)).toBe(xpForLevel(99));
  });
});

describe("levelForXp", () => {
  test("0 XP → level 1", () => {
    expect(levelForXp(0)).toBe(1);
  });

  test("82 XP → level 1", () => {
    expect(levelForXp(82)).toBe(1);
  });

  test("83 XP → level 2", () => {
    expect(levelForXp(83)).toBe(2);
  });

  test("inverse of xpForLevel for levels 1–99", () => {
    for (let level = 1; level <= 99; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
    }
  });

  test("XP between levels returns lower level", () => {
    expect(levelForXp(100)).toBe(2); // between 83 (lv2) and 174 (lv3)
  });
});

describe("xpToNextLevel", () => {
  test("level 1 with 0 XP needs 83 to next", () => {
    expect(xpToNextLevel({ level: 1, xp: 0 })).toBe(83);
  });

  test("level 1 with 50 XP needs 33 to next", () => {
    expect(xpToNextLevel({ level: 1, xp: 50 })).toBe(33);
  });

  test("level 99 returns 0", () => {
    expect(xpToNextLevel({ level: 99, xp: 13034431 })).toBe(0);
  });
});
