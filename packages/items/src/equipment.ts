import type { EquipSlot, EquipmentState, InventoryState } from "@realm-of-idlers/shared";
import type { ItemDef } from "./types.js";
import { countFreeSlots } from "./inventory.js";

export type EquipResult =
  | { ok: true; inventory: InventoryState; equipment: EquipmentState }
  | { ok: false; reason: string };

/**
 * Equip an item from an inventory slot index.
 *
 * - Validates item has an `equipSlot`.
 * - If the equipment slot is occupied, swaps the old item into the inventory slot.
 * - Otherwise clears the inventory slot.
 */
export function equipItem(
  inventory: InventoryState,
  equipment: EquipmentState,
  slotIndex: number,
  itemDef: ItemDef,
): EquipResult {
  const slot = inventory.slots[slotIndex];
  if (!slot) {
    return { ok: false, reason: "No item in that inventory slot." };
  }
  if (!itemDef.equipSlot) {
    return { ok: false, reason: "This item cannot be equipped." };
  }

  const targetSlot: EquipSlot = itemDef.equipSlot;
  const currentEquipped = equipment.equipped[targetSlot];

  const newSlots = inventory.slots.map((s) => (s ? { ...s } : null));
  const newEquipped = { ...equipment.equipped };

  // Place item in equipment
  newEquipped[targetSlot] = slot.itemId;

  // Handle the inventory slot
  if (currentEquipped) {
    // Swap: put old equipment into the inventory slot
    newSlots[slotIndex] = { itemId: currentEquipped, quantity: 1 };
  } else {
    // Clear inventory slot
    newSlots[slotIndex] = null;
  }

  return {
    ok: true,
    inventory: { slots: newSlots },
    equipment: { equipped: newEquipped },
  };
}

/**
 * Unequip an item from an equipment slot back to inventory.
 *
 * Fails if inventory is full.
 */
export function unequipItem(
  inventory: InventoryState,
  equipment: EquipmentState,
  slot: EquipSlot,
): EquipResult {
  const itemId = equipment.equipped[slot];
  if (!itemId) {
    return { ok: false, reason: "Nothing equipped in that slot." };
  }

  if (countFreeSlots(inventory) === 0) {
    return { ok: false, reason: "Inventory is full." };
  }

  const newSlots = inventory.slots.map((s) => (s ? { ...s } : null));
  const newEquipped = { ...equipment.equipped };

  // Remove from equipment
  delete newEquipped[slot];

  // Add to first empty inventory slot
  const emptyIdx = newSlots.findIndex((s) => s === null);
  newSlots[emptyIdx] = { itemId, quantity: 1 };

  return {
    ok: true,
    inventory: { slots: newSlots },
    equipment: { equipped: newEquipped },
  };
}
