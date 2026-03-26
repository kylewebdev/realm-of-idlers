import { describe, expect, it } from "vite-plus/test";
import type { BankState, InventoryState } from "@realm-of-idlers/shared";
import { INVENTORY_SLOTS, BANK_SLOTS } from "@realm-of-idlers/shared";
import { deposit, withdraw } from "../src/bank.js";

function emptyInventory(): InventoryState {
  return { slots: Array.from({ length: INVENTORY_SLOTS }, () => null) };
}

function emptyBank(): BankState {
  return { slots: Array.from({ length: BANK_SLOTS }, () => null) };
}

describe("bank operations", () => {
  describe("deposit", () => {
    it("removes from inventory and adds to bank", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 10 };
      const bank = emptyBank();

      const result = deposit(inv, bank, "normal-log", 5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 5 });
        expect(result.bank.slots[0]).toEqual({ itemId: "normal-log", quantity: 5 });
      }
    });

    it("stacks in bank with existing items", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 5 };
      const bank = emptyBank();
      bank.slots[3] = { itemId: "normal-log", quantity: 10 };

      const result = deposit(inv, bank, "normal-log", 5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bank.slots[3]).toEqual({ itemId: "normal-log", quantity: 15 });
      }
    });

    it("fails when not enough items in inventory", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 2 };

      const result = deposit(inv, emptyBank(), "normal-log", 5);

      expect(result.ok).toBe(false);
    });

    it("does not mutate originals", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "normal-log", quantity: 10 };
      const bank = emptyBank();

      deposit(inv, bank, "normal-log", 5);

      expect(inv.slots[0]!.quantity).toBe(10);
      expect(bank.slots[0]).toBeNull();
    });
  });

  describe("withdraw", () => {
    it("removes from bank and adds to inventory", () => {
      const bank = emptyBank();
      bank.slots[0] = { itemId: "normal-log", quantity: 10 };
      const inv = emptyInventory();

      const result = withdraw(bank, inv, "normal-log", 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bank.slots[0]).toEqual({ itemId: "normal-log", quantity: 7 });
        expect(result.inventory.slots[0]).toEqual({ itemId: "normal-log", quantity: 3 });
      }
    });

    it("clears bank slot when fully withdrawn", () => {
      const bank = emptyBank();
      bank.slots[0] = { itemId: "normal-log", quantity: 5 };

      const result = withdraw(bank, emptyInventory(), "normal-log", 5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bank.slots[0]).toBeNull();
      }
    });

    it("fails when item not in bank", () => {
      const result = withdraw(emptyBank(), emptyInventory(), "normal-log", 1);
      expect(result.ok).toBe(false);
    });

    it("fails when inventory is full", () => {
      const bank = emptyBank();
      bank.slots[0] = { itemId: "normal-log", quantity: 10 };
      const inv = emptyInventory();
      for (let i = 0; i < INVENTORY_SLOTS; i++) {
        inv.slots[i] = { itemId: `junk-${i}`, quantity: 1 };
      }

      const result = withdraw(bank, inv, "normal-log", 1);
      expect(result.ok).toBe(false);
    });
  });

  describe("round-trip", () => {
    it("deposit then withdraw preserves items", () => {
      const inv = emptyInventory();
      inv.slots[0] = { itemId: "iron-ore", quantity: 20 };
      const bank = emptyBank();

      const dep = deposit(inv, bank, "iron-ore", 20);
      expect(dep.ok).toBe(true);
      if (!dep.ok) return;

      const wd = withdraw(dep.bank, dep.inventory, "iron-ore", 20);
      expect(wd.ok).toBe(true);
      if (!wd.ok) return;

      expect(wd.inventory.slots[0]).toEqual({ itemId: "iron-ore", quantity: 20 });
      expect(wd.bank.slots[0]).toBeNull();
    });
  });
});
