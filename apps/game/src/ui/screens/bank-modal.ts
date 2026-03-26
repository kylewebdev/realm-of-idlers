import { gameStore } from "@realm-of-idlers/state";
import { getItem, deposit, withdraw } from "@realm-of-idlers/items";
import { uiStore } from "../store.js";

export function renderBankModal(container: HTMLElement): void {
  function render() {
    const state = gameStore.getState();
    const inv = state.inventory;
    const bank = state.bank;

    const invSlots = inv.slots
      .map((slot, i) => {
        if (!slot) return `<div class="inv-slot" data-inv="${i}" title="Empty"></div>`;
        const def = getItem(slot.itemId);
        const name = def?.name ?? slot.itemId;
        const qty = slot.quantity > 1 ? ` x${slot.quantity}` : "";
        return `<div class="inv-slot filled" data-inv="${i}" data-item="${slot.itemId}" title="${name}">${name.slice(0, 6)}${qty}</div>`;
      })
      .join("");

    const bankSlots = bank.slots
      .slice(0, 48)
      .map((slot, i) => {
        if (!slot) return `<div class="inv-slot" data-bank="${i}" title="Empty"></div>`;
        const def = getItem(slot.itemId);
        const name = def?.name ?? slot.itemId;
        const qty = slot.quantity > 1 ? ` x${slot.quantity}` : "";
        return `<div class="inv-slot filled" data-bank="${i}" data-item="${slot.itemId}" title="${name}">${name.slice(0, 6)}${qty}</div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content" style="width:540px">
        <div class="modal-header">
          <h2>Bank</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="bank-layout">
            <div class="bank-col">
              <h3>Inventory</h3>
              <div class="inventory-grid">${invSlots}</div>
            </div>
            <div class="bank-col">
              <h3>Bank</h3>
              <div class="bank-grid">${bankSlots}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Close handlers
    container
      .querySelector(".modal-close")!
      .addEventListener("click", () => uiStore.getState().closeModal());
    container
      .querySelector(".modal-backdrop")!
      .addEventListener("click", () => uiStore.getState().closeModal());

    // Deposit: click inventory item
    container.querySelectorAll("[data-inv][data-item]").forEach((el) => {
      el.addEventListener("click", () => {
        const itemId = (el as HTMLElement).dataset.item!;
        const state = gameStore.getState();
        const result = deposit(state.inventory, state.bank, itemId, 1);
        if (result.ok) {
          gameStore.getState().loadState({
            ...gameStore.getState(),
            inventory: result.inventory,
            bank: result.bank,
          });
          render();
        }
      });
    });

    // Withdraw: click bank item
    container.querySelectorAll("[data-bank][data-item]").forEach((el) => {
      el.addEventListener("click", () => {
        const itemId = (el as HTMLElement).dataset.item!;
        const state = gameStore.getState();
        const result = withdraw(state.bank, state.inventory, itemId, 1);
        if (result.ok) {
          gameStore.getState().loadState({
            ...gameStore.getState(),
            inventory: result.inventory,
            bank: result.bank,
          });
          render();
        }
      });
    });
  }

  render();
}
