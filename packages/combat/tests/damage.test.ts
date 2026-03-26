import { describe, expect, it } from "vite-plus/test";
import type { EquipmentState } from "@realm-of-idlers/shared";
import { calculateHitChance, calculateMaxHit, getEquipmentBonuses } from "../src/damage.js";
import { ITEMS } from "@realm-of-idlers/items";

describe("calculateHitChance", () => {
  it("returns value between 0 and 1", () => {
    const chance = calculateHitChance(10, 5, 8);
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(1);
  });

  it("higher attack gives higher hit chance", () => {
    const low = calculateHitChance(1, 0, 5);
    const high = calculateHitChance(20, 0, 5);
    expect(high).toBeGreaterThan(low);
  });

  it("higher enemy defence gives lower hit chance", () => {
    const lowDef = calculateHitChance(10, 0, 1);
    const highDef = calculateHitChance(10, 0, 20);
    expect(highDef).toBeLessThan(lowDef);
  });

  it("equipment bonus increases hit chance", () => {
    const noEquip = calculateHitChance(10, 0, 5);
    const withEquip = calculateHitChance(10, 8, 5);
    expect(withEquip).toBeGreaterThan(noEquip);
  });

  it("returns 0 when accuracy and defence are both 0", () => {
    expect(calculateHitChance(0, 0, 0)).toBe(0);
  });
});

describe("calculateMaxHit", () => {
  it("scales with strength and equipment", () => {
    expect(calculateMaxHit(1, 0)).toBe(1);
    expect(calculateMaxHit(10, 5)).toBe(15);
  });
});

describe("getEquipmentBonuses", () => {
  it("sums bonuses from equipped items", () => {
    const equipment: EquipmentState = {
      equipped: { weapon: "bronze-sword", body: "bronze-platebody" },
    };
    const bonuses = getEquipmentBonuses(equipment, ITEMS);

    // bronze-sword: attack 4, strength 3, defence 0
    // bronze-platebody: attack 0, strength 0, defence 7
    expect(bonuses.attack).toBe(4);
    expect(bonuses.strength).toBe(3);
    expect(bonuses.defence).toBe(7);
  });

  it("returns zeros for empty equipment", () => {
    const equipment: EquipmentState = { equipped: {} };
    const bonuses = getEquipmentBonuses(equipment, ITEMS);

    expect(bonuses.attack).toBe(0);
    expect(bonuses.strength).toBe(0);
    expect(bonuses.defence).toBe(0);
  });
});
