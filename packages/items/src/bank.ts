import type { BankState, InventoryState, ItemId } from "@realm-of-idlers/shared";
import { countItem } from "./inventory.js";

export type BankResult =
  | { ok: true; inventory: InventoryState; bank: BankState }
  | { ok: false; reason: string };

/**
 * Deposit items from inventory into the bank.
 *
 * All items stack in the bank regardless of their `stackable` flag.
 */
export function deposit(
  inventory: InventoryState,
  bank: BankState,
  itemId: ItemId,
  qty: number,
): BankResult {
  const available = countItem(inventory, itemId);
  if (available < qty) {
    return { ok: false, reason: "Not enough items in inventory." };
  }

  // Remove from inventory
  const newInvSlots = inventory.slots.map((s) => (s ? { ...s } : null));
  let remaining = qty;
  for (let i = 0; i < newInvSlots.length && remaining > 0; i++) {
    const slot = newInvSlots[i];
    if (slot !== null && slot.itemId === itemId) {
      const take = Math.min(slot.quantity, remaining);
      slot.quantity -= take;
      remaining -= take;
      if (slot.quantity <= 0) newInvSlots[i] = null;
    }
  }

  // Add to bank (always stacks)
  const newBankSlots = bank.slots.map((s) => (s ? { ...s } : null));
  const bankIdx = newBankSlots.findIndex((s) => s !== null && s.itemId === itemId);
  if (bankIdx >= 0) {
    newBankSlots[bankIdx] = { itemId, quantity: newBankSlots[bankIdx]!.quantity + qty };
  } else {
    const emptyIdx = newBankSlots.findIndex((s) => s === null);
    if (emptyIdx < 0) {
      return { ok: false, reason: "Bank is full." };
    }
    newBankSlots[emptyIdx] = { itemId, quantity: qty };
  }

  return {
    ok: true,
    inventory: { slots: newInvSlots },
    bank: { slots: newBankSlots },
  };
}

/**
 * Withdraw items from the bank into inventory.
 *
 * Items are added to inventory as a single stack (for simplicity).
 */
export function withdraw(
  bank: BankState,
  inventory: InventoryState,
  itemId: ItemId,
  qty: number,
): BankResult {
  const bankSlotIdx = bank.slots.findIndex((s) => s !== null && s.itemId === itemId);
  if (bankSlotIdx < 0) {
    return { ok: false, reason: "Item not in bank." };
  }

  const bankSlot = bank.slots[bankSlotIdx]!;
  if (bankSlot.quantity < qty) {
    return { ok: false, reason: "Not enough items in bank." };
  }

  // Try to add to inventory (stack into existing or use empty slot)
  const newInvSlots = inventory.slots.map((s) => (s ? { ...s } : null));
  const invIdx = newInvSlots.findIndex((s) => s !== null && s.itemId === itemId);
  if (invIdx >= 0) {
    newInvSlots[invIdx] = { itemId, quantity: newInvSlots[invIdx]!.quantity + qty };
  } else {
    const emptyIdx = newInvSlots.findIndex((s) => s === null);
    if (emptyIdx < 0) {
      return { ok: false, reason: "Inventory is full." };
    }
    newInvSlots[emptyIdx] = { itemId, quantity: qty };
  }

  // Remove from bank
  const newBankSlots = bank.slots.map((s) => (s ? { ...s } : null));
  const newQty = bankSlot.quantity - qty;
  if (newQty <= 0) {
    newBankSlots[bankSlotIdx] = null;
  } else {
    newBankSlots[bankSlotIdx] = { itemId, quantity: newQty };
  }

  return {
    ok: true,
    inventory: { slots: newInvSlots },
    bank: { slots: newBankSlots },
  };
}
