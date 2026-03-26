import { describe, expect, it } from "vite-plus/test";
import type { InventoryState } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS } from "@realm-of-idlers/shared";
import { addItem, removeItem, hasItem, countItem, countFreeSlots } from "../src/inventory.js";
import { getItem } from "../src/registry.js";

function emptyInventory(): InventoryState {
  return { slots: Array.from({ length: INVENTORY_SLOTS }, () => null) };
}

describe("inventory operations", () => {
  describe("addItem", () => {
    it("adds stackable item to first empty slot", () => {
      const inv = emptyInventory();
      const result = addItem(inv, "normal-log", 5, getItem("normal-log")!);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 5 });
      }
    });

    it("stacks onto existing matching slot", () => {
      const inv = emptyInventory();
      inv.slots[3] = { itemId: "normal-log", quantity: 10 };
      const result = addItem(inv, "normal-log", 5, getItem("normal-log")!);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inventory.slots[3]).toEqual({ itemId: "normal-log", quantity: 15 });
      }
    });

    it("adds non-stackable item to separate slots", () => {
      const inv = emptyInventory();
      const result = addItem(inv, "bronze-sword", 3, getItem("bronze-sword")!);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inventory.slots[0]).toEqual({ itemId: "bronze-sword", quantity: 1 });
        expect(result.inventory.slots[1]).toEqual({ itemId: "bronze-sword", quantity: 1 });
        expect(result.inventory.slots[2]).toEqual({ itemId: "bronze-sword", quantity: 1 });
      }
    });

    it("returns full when no slots available", () => {
      const inv = emptyInventory();
      for (let i = 0; i < INVENTORY_SLOTS; i++) {
        inv.slots[i] = { itemId: `junk-${i}`, quantity: 1 };
      }
      const result = addItem(inv, "normal-log", 1, getItem("normal-log")!);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("full");
    });

    it("does not mutate original inventory", () => {
      const inv = emptyInventory();
      addItem(inv, "normal-log", 5, getItem("normal-log")!);
      expect(inv.slots[0]).toBeNull();
    });
  });

  describe("removeItem", () => {
    it("reduces quantity", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 10 };
      const result = removeItem(inv, "normal-log", 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 7 });
      }
    });

    it("clears slot when fully consumed", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 5 };
      const result = removeItem(inv, "normal-log", 5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inventory.slots[0]).toBeNull();
      }
    });

    it("returns insufficient when not enough", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 2 };
      const result = removeItem(inv, "normal-log", 5);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("insufficient");
    });

    it("does not mutate original", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 10 };
      removeItem(inv, "normal-log", 3);
      expect(inv.slots[0]!.quantity).toBe(10);
    });
  });

  describe("hasItem / countItem / countFreeSlots", () => {
    it("hasItem returns true when sufficient", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 10 };
      expect(hasItem(inv, "normal-log", 10)).toBe(true);
      expect(hasItem(inv, "normal-log", 11)).toBe(false);
    });

    it("countItem sums across slots", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "bones", quantity: 5 };
      inv.slots[5] = { itemId: "bones", quantity: 3 };
      expect(countItem(inv, "bones")).toBe(8);
    });

    it("countFreeSlots counts nulls", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 1 };
      inv.slots[1] = { itemId: "oak-log", quantity: 1 };
      expect(countFreeSlots(inv)).toBe(INVENTORY_SLOTS - 2);
    });
  });
});
