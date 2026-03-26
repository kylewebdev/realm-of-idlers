import { describe, expect, it } from "vite-plus/test";
import type { EquipmentState, InventoryState } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS } from "@realm-of-idlers/shared";
import { equipItem, unequipItem } from "../src/equipment.js";
import { getItem } from "../src/registry.js";

function emptyInventory(): InventoryState {
  return { slots: Array.from({ length: INVENTORY_SLOTS }, () => null) };
}

function emptyEquipment(): EquipmentState {
  return { equipped: {} };
}

describe("equipment operations", () => {
  describe("equipItem", () => {
    it("equips an item from inventory", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "bronze-sword", quantity: 1 };
      const equip = emptyEquipment();

      const result = equipItem(inv, equip, 0, getItem("bronze-sword")!);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.equipment.equipped.weapon).toBe("bronze-sword");
        expect(result.inventory.slots[0]).toBeNull();
      }
    });

    it("swaps when slot is already occupied", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "iron-sword", quantity: 1 };
      const equip: EquipmentState = { equipped: { weapon: "bronze-sword" } };

      const result = equipItem(inv, equip, 0, getItem("iron-sword")!);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.equipment.equipped.weapon).toBe("iron-sword");
        expect(result.inventory.slots[0]).toEqual({ itemId: "bronze-sword", quantity: 1 });
      }
    });

    it("fails for non-equippable items", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 1 };

      const result = equipItem(inv, emptyEquipment(), 0, getItem("normal-log")!);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("cannot be equipped");
    });

    it("fails for empty inventory slot", () => {
      const result = equipItem(emptyInventory(), emptyEquipment(), 0, getItem("bronze-sword")!);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("No item");
    });

    it("does not mutate original state", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "bronze-sword", quantity: 1 };
      const equip = emptyEquipment();

      equipItem(inv, equip, 0, getItem("bronze-sword")!);

      expect(inv.slots[0]).toEqual({ itemId: "bronze-sword", quantity: 1 });
      expect(equip.equipped.weapon).toBeUndefined();
    });
  });

  describe("unequipItem", () => {
    it("moves equipment to inventory", () => {
      const inv = emptyInventory();
      const equip: EquipmentState = { equipped: { weapon: "bronze-sword" } };

      const result = unequipItem(inv, equip, "weapon");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.equipment.equipped.weapon).toBeUndefined();
        expect(result.inventory.slots[0]).toEqual({ itemId: "bronze-sword", quantity: 1 });
      }
    });

    it("fails when inventory is full", () => {
      const inv = emptyInventory();
      for (let i = 0; i < INVENTORY_SLOTS; i++) {
        inv.slots[i] = { itemId: `junk-${i}`, quantity: 1 };
      }
      const equip: EquipmentState = { equipped: { weapon: "bronze-sword" } };

      const result = unequipItem(inv, equip, "weapon");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("full");
    });

    it("fails for empty equipment slot", () => {
      const result = unequipItem(emptyInventory(), emptyEquipment(), "weapon");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("Nothing equipped");
    });
  });
});
