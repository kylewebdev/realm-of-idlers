import { describe, expect, it } from "vite-plus/test";
import type { InventoryState } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS } from "@realm-of-idlers/shared";
import { buyItem, sellItem } from "../src/shop.js";
import { getItem } from "../src/registry.js";
import type { ShopDef } from "../src/types.js";

function emptyInventory(): InventoryState {
  return { slots: Array.from({ length: INVENTORY_SLOTS }, () => null) };
}

const TEST_SHOP: ShopDef = {
  id: "general-store",
  name: "General Store",
  stock: [
    { itemId: "bronze-axe", basePrice: 16 },
    { itemId: "bronze-pickaxe", basePrice: 16 },
    { itemId: "fishing-rod", basePrice: 12 },
    { itemId: "cooked-shrimp", basePrice: 8 },
  ],
};

describe("shop operations", () => {
  describe("buyItem", () => {
    it("deducts gold and adds item", () => {
      const result = buyItem(
        100,
        emptyInventory(),
        "bronze-axe",
        1,
        TEST_SHOP,
        getItem("bronze-axe")!,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.gold).toBe(84); // 100 - 16
        expect(result.inventory.slots[0]).toEqual({ itemId: "bronze-axe", quantity: 1 });
      }
    });

    it("buys multiple stackable items", () => {
      const result = buyItem(
        100,
        emptyInventory(),
        "cooked-shrimp",
        5,
        TEST_SHOP,
        getItem("cooked-shrimp")!,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.gold).toBe(60); // 100 - 40
        expect(result.inventory.slots[0]).toEqual({ itemId: "cooked-shrimp", quantity: 5 });
      }
    });

    it("fails with insufficient gold", () => {
      const result = buyItem(
        5,
        emptyInventory(),
        "bronze-axe",
        1,
        TEST_SHOP,
        getItem("bronze-axe")!,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("gold");
    });

    it("fails when item not in shop", () => {
      const result = buyItem(
        1000,
        emptyInventory(),
        "iron-sword",
        1,
        TEST_SHOP,
        getItem("iron-sword")!,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("not available");
    });

    it("fails when inventory is full", () => {
      const inv = emptyInventory();
      for (let i = 0; i < INVENTORY_SLOTS; i++) {
        inv.slots[i] = { itemId: `junk-${i}`, quantity: 1 };
      }
      const result = buyItem(100, inv, "bronze-axe", 1, TEST_SHOP, getItem("bronze-axe")!);

      expect(result.ok).toBe(false);
    });
  });

  describe("sellItem", () => {
    it("adds gold and removes item", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 10 };
      const result = sellItem(50, inv, "normal-log", 5, getItem("normal-log")!);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.gold).toBe(55); // 50 + 5*1
        expect(result.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 5 });
      }
    });

    it("fails when not enough items", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 2 };
      const result = sellItem(50, inv, "normal-log", 5, getItem("normal-log")!);

      expect(result.ok).toBe(false);
    });

    it("fails for zero-value items", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "burnt-fish", quantity: 5 };
      const result = sellItem(50, inv, "burnt-fish", 1, getItem("burnt-fish")!);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("cannot be sold");
    });
  });
});
