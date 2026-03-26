import type { EquipSlot } from "@realm-of-idlers/shared";
import { gameStore } from "@realm-of-idlers/state";
import { getItem, unequipItem } from "@realm-of-idlers/items";

const EQUIP_SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: "head", label: "Head" },
  { slot: "body", label: "Body" },
  { slot: "legs", label: "Legs" },
  { slot: "weapon", label: "Weapon" },
  { slot: "shield", label: "Shield" },
];

export function createEquipmentPanel(container: HTMLElement): () => void {
  container.innerHTML = `
    <div class="equipment-layout">
      <div class="equipment-grid"></div>
      <div class="equipment-stats"></div>
    </div>
  `;

  const gridEl = container.querySelector(".equipment-grid")!;
  const statsEl = container.querySelector(".equipment-stats")!;

  for (const { slot, label } of EQUIP_SLOTS) {
    const el = document.createElement("div");
    el.className = "equip-slot-large";
    el.dataset.slot = slot;
    el.innerHTML = `<span class="equip-label">${label}</span><span class="equip-item">Empty</span>`;
    el.addEventListener("click", () => handleUnequip(slot));
    gridEl.appendChild(el);
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
    let totalAttack = 0;
    let totalStrength = 0;
    let totalDefence = 0;

    for (const { slot } of EQUIP_SLOTS) {
      const el = gridEl.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      const itemEl = el.querySelector(".equip-item")!;
      const itemId = state.equipment.equipped[slot];
      if (itemId) {
        const item = getItem(itemId);
        itemEl.textContent = item?.name ?? "?";
        el.classList.add("filled");
        if (item?.equipStats) {
          totalAttack += item.equipStats.attack ?? 0;
          totalStrength += item.equipStats.strength ?? 0;
          totalDefence += item.equipStats.defence ?? 0;
        }
      } else {
        itemEl.textContent = "Empty";
        el.classList.remove("filled");
      }
    }

    statsEl.innerHTML = `
      <div class="stat-line">Attack bonus: <span class="stat-val">+${totalAttack}</span></div>
      <div class="stat-line">Strength bonus: <span class="stat-val">+${totalStrength}</span></div>
      <div class="stat-line">Defence bonus: <span class="stat-val">+${totalDefence}</span></div>
    `;
  }

  update();
  return gameStore.subscribe(update);
}
