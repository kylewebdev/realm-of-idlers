import { describe, expect, it } from "vite-plus/test";
import { ITEMS, getItem } from "../src/registry.js";

describe("item registry", () => {
  it("contains items", () => {
    expect(Object.keys(ITEMS).length).toBeGreaterThan(30);
  });

  it("all items have valid category", () => {
    const validCategories = ["resource", "equipment", "food", "tool", "quest"];
    for (const item of Object.values(ITEMS)) {
      expect(validCategories).toContain(item.category);
    }
  });

  it("all items have non-negative sellValue", () => {
    for (const item of Object.values(ITEMS)) {
      expect(item.sellValue).toBeGreaterThanOrEqual(0);
    }
  });

  it("equipment items have equipSlot and equipStats", () => {
    for (const item of Object.values(ITEMS)) {
      if (item.category === "equipment") {
        expect(item.equipSlot).toBeDefined();
        expect(item.equipStats).toBeDefined();
      }
    }
  });

  it("food items have healAmount", () => {
    for (const item of Object.values(ITEMS)) {
      if (item.category === "food" && item.id !== "burnt-fish") {
        expect(item.healAmount).toBeGreaterThan(0);
      }
    }
  });

  it("getItem returns correct item", () => {
    const log = getItem("normal-log");
    expect(log).toBeDefined();
    expect(log!.name).toBe("Normal Log");
    expect(log!.stackable).toBe(true);
  });

  it("getItem returns undefined for unknown item", () => {
    expect(getItem("nonexistent")).toBeUndefined();
  });

  it("no duplicate item IDs", () => {
    const ids = Object.keys(ITEMS);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
