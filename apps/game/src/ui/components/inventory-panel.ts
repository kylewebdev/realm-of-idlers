import type { EquipSlot } from "@realm-of-idlers/shared";
import { gameStore } from "@realm-of-idlers/state";
import { getItem, equipItem, unequipItem } from "@realm-of-idlers/items";

const EQUIP_SLOTS: EquipSlot[] = ["weapon", "head", "body", "legs", "shield"];

export function createInventoryPanel(container: HTMLElement): () => void {
  container.innerHTML = `
    <h3 class="panel-title">Inventory</h3>
    <div class="equip-slots"></div>
    <div class="inventory-grid"></div>
  `;

  const equipEl = container.querySelector(".equip-slots")!;
  const gridEl = container.querySelector(".inventory-grid")!;

  // Create equipment slots
  for (const slot of EQUIP_SLOTS) {
    const el = document.createElement("div");
    el.className = "equip-slot";
    el.dataset.slot = slot;
    el.title = slot;
    el.addEventListener("click", () => handleUnequip(slot));
    equipEl.appendChild(el);
  }

  // Create inventory grid (28 slots)
  for (let i = 0; i < 28; i++) {
    const el = document.createElement("div");
    el.className = "inv-slot";
    el.dataset.index = String(i);
    el.addEventListener("click", () => handleEquip(i));
    gridEl.appendChild(el);
  }

  function handleEquip(slotIndex: number) {
    const state = gameStore.getState();
    const slot = state.inventory.slots[slotIndex];
    if (!slot) return;
    const itemDef = getItem(slot.itemId);
    if (!itemDef?.equipSlot) return;

    const result = equipItem(state.inventory, state.equipment, slotIndex, itemDef);
    if (result.ok) {
      gameStore.getState().loadState({
        ...gameStore.getState(),
        inventory: result.inventory,
        equipment: result.equipment,
      });
    }
  }

  function handleUnequip(slot: EquipSlot) {
    const state = gameStore.getState();
    const result = unequipItem(state.inventory, state.equipment, slot);
    if (result.ok) {
      gameStore.getState().loadState({
        ...gameStore.getState(),
        inventory: result.inventory,
        equipment: result.equipment,
      });
    }
  }

  function update() {
    const state = gameStore.getState();

    // Update equipment slots
    for (const slot of EQUIP_SLOTS) {
      const el = equipEl.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      const itemId = state.equipment.equipped[slot];
      if (itemId) {
        const item = getItem(itemId);
        el.textContent = item?.name?.slice(0, 3) ?? "?";
        el.classList.add("filled");
        el.title = item?.name ?? slot;
      } else {
        el.textContent = "";
        el.classList.remove("filled");
        el.title = slot;
      }
    }

    // Update inventory grid
    const slots = state.inventory.slots;
    for (let i = 0; i < 28; i++) {
      const el = gridEl.querySelector(`[data-index="${i}"]`) as HTMLElement;
      const item = slots[i];
      if (item) {
        const def = getItem(item.itemId);
        el.textContent = def
          ? `${def.name.slice(0, 6)}${item.quantity > 1 ? ` x${item.quantity}` : ""}`
          : item.itemId;
        el.classList.add("filled");
        el.title = def?.name ?? item.itemId;
      } else {
        el.textContent = "";
        el.classList.remove("filled");
        el.title = "Empty";
      }
    }
  }

  update();
  return gameStore.subscribe(update);
}
