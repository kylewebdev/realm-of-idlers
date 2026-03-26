import { gameStore } from "@realm-of-idlers/state";
import { getItem, equipItem } from "@realm-of-idlers/items";

export function createInventoryPanel(container: HTMLElement): () => void {
  container.innerHTML = `<div class="inventory-grid"></div>`;

  const gridEl = container.querySelector(".inventory-grid")!;

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

  function update() {
    const state = gameStore.getState();
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
