import { describe, expect, it } from "vite-plus/test";
import type { InventoryState } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS } from "@realm-of-idlers/shared";
import { autoEat } from "../src/auto-eat.js";
import { ITEMS } from "@realm-of-idlers/items";

function emptyInventory(): InventoryState {
  return { slots: Array.from({ length: INVENTORY_SLOTS }, () => null) };
}

describe("autoEat", () => {
  it("does not trigger above threshold", () => {
    const inv = emptyInventory();
    inv.slots[0] = { itemId: "cooked-shrimp", quantity: 5 };

    const result = autoEat(inv, 10, 10, 0.5, ITEMS);
    expect(result.ateFood).toBeUndefined();
    expect(result.hpHealed).toBe(0);
  });

  it("triggers below threshold and picks best food", () => {
    const inv = emptyInventory();
    inv.slots[0] = { itemId: "cooked-shrimp", quantity: 5 }; // heals 3
    inv.slots[1] = { itemId: "cooked-trout", quantity: 2 }; // heals 7

    const result = autoEat(inv, 4, 10, 0.5, ITEMS);
    expect(result.ateFood).toBe("cooked-trout");
    expect(result.hpHealed).toBe(6); // min(7, 10-4)
  });

  it("picks only food with lower heal if best not available", () => {
    const inv = emptyInventory();
    inv.slots[0] = { itemId: "cooked-shrimp", quantity: 3 };

    const result = autoEat(inv, 3, 10, 0.5, ITEMS);
    expect(result.ateFood).toBe("cooked-shrimp");
    expect(result.hpHealed).toBe(3);
  });

  it("returns nothing when no food in inventory", () => {
    const inv = emptyInventory();
    inv.slots[0] = { itemId: "normal-log", quantity: 10 };

    const result = autoEat(inv, 3, 10, 0.5, ITEMS);
    expect(result.ateFood).toBeUndefined();
    expect(result.hpHealed).toBe(0);
  });

  it("does not overheal beyond maxHp", () => {
    const inv = emptyInventory();
    inv.slots[0] = { itemId: "cooked-trout", quantity: 1 }; // heals 7

    const result = autoEat(inv, 8, 10, 0.5, ITEMS);
    // HP at 8/10 = 80%, above 50% threshold — should NOT eat
    expect(result.ateFood).toBeUndefined();
  });
});
