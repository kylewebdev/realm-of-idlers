import type { InventoryState, ItemId } from "@realm-of-idlers/shared";
import type { ItemDef } from "./types.js";

export type InventoryResult =
  | { ok: true; inventory: InventoryState }
  | { ok: false; reason: "full" | "insufficient" };

/**
 * Add items to inventory (immutable).
 *
 * Stackable items merge into an existing matching slot or use the first empty slot.
 * Non-stackable items each take one slot (quantity is always 1 per slot).
 */
export function addItem(
  inventory: InventoryState,
  itemId: ItemId,
  qty: number,
  itemDef: ItemDef,
): InventoryResult {
  const slots = inventory.slots.map((s) => (s ? { ...s } : null));

  if (itemDef.stackable) {
    // Find existing stack
    const idx = slots.findIndex((s) => s !== null && s.itemId === itemId);
    if (idx >= 0) {
      slots[idx] = { itemId, quantity: slots[idx]!.quantity + qty };
      return { ok: true, inventory: { slots } };
    }
    // Find first empty slot
    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx < 0) return { ok: false, reason: "full" };
    slots[emptyIdx] = { itemId, quantity: qty };
    return { ok: true, inventory: { slots } };
  }

  // Non-stackable: need `qty` free slots, each holding quantity 1
  const emptyIndices: number[] = [];
  for (let i = 0; i < slots.length && emptyIndices.length < qty; i++) {
    if (slots[i] === null) emptyIndices.push(i);
  }
  if (emptyIndices.length < qty) return { ok: false, reason: "full" };

  for (const idx of emptyIndices) {
    slots[idx] = { itemId, quantity: 1 };
  }
  return { ok: true, inventory: { slots } };
}

/**
 * Remove items from inventory (immutable).
 */
export function removeItem(
  inventory: InventoryState,
  itemId: ItemId,
  qty: number,
): InventoryResult {
  if (!hasItem(inventory, itemId, qty)) {
    return { ok: false, reason: "insufficient" };
  }

  const slots = inventory.slots.map((s) => (s ? { ...s } : null));
  let remaining = qty;

  for (let i = 0; i < slots.length && remaining > 0; i++) {
    const slot = slots[i];
    if (slot !== null && slot.itemId === itemId) {
      const take = Math.min(slot.quantity, remaining);
      slot.quantity -= take;
      remaining -= take;
      if (slot.quantity <= 0) {
        slots[i] = null;
      }
    }
  }

  return { ok: true, inventory: { slots } };
}

/** Check if inventory contains at least `qty` of the given item. */
export function hasItem(inventory: InventoryState, itemId: ItemId, qty: number): boolean {
  return countItem(inventory, itemId) >= qty;
}

/** Count total quantity of an item across all inventory slots. */
export function countItem(inventory: InventoryState, itemId: ItemId): number {
  let total = 0;
  for (const slot of inventory.slots) {
    if (slot !== null && slot.itemId === itemId) {
      total += slot.quantity;
    }
  }
  return total;
}

/** Count empty (null) slots. */
export function countFreeSlots(inventory: InventoryState): number {
  let count = 0;
  for (const slot of inventory.slots) {
    if (slot === null) count++;
  }
  return count;
}
