import { gameStore } from "@realm-of-idlers/state";
import { getItem, buyItem, sellItem } from "@realm-of-idlers/items";
import { uiStore } from "../store.js";
import { GENERAL_STORE } from "../../shops/general-store.js";

export function renderShopModal(container: HTMLElement): void {
  function render() {
    const state = gameStore.getState();

    const stockRows = GENERAL_STORE.stock
      .map((entry) => {
        const def = getItem(entry.itemId);
        const name = def?.name ?? entry.itemId;
        const canAfford = state.player.gold >= entry.basePrice;
        return `
        <div class="shop-row" style="${canAfford ? "" : "opacity:0.5"}">
          <div class="shop-item-info">
            <span>${name}</span>
            <span class="activity-meta">${entry.basePrice} gold</span>
          </div>
          ${canAfford ? `<button class="btn-start" data-buy="${entry.itemId}" data-price="${entry.basePrice}">Buy</button>` : `<span class="activity-meta">Not enough gold</span>`}
        </div>
      `;
      })
      .join("");

    const sellRows = state.inventory.slots
      .filter((slot) => slot !== null)
      .map((slot) => {
        const def = getItem(slot!.itemId);
        const name = def?.name ?? slot!.itemId;
        const sellValue = def?.sellValue ?? 0;
        if (sellValue <= 0) return "";
        const qty = slot!.quantity > 1 ? ` x${slot!.quantity}` : "";
        return `
        <div class="shop-row">
          <div class="shop-item-info">
            <span>${name}${qty}</span>
            <span class="activity-meta">${sellValue} gold each</span>
          </div>
          <button class="btn-start" data-sell="${slot!.itemId}">Sell 1</button>
        </div>
      `;
      })
      .filter(Boolean)
      .join("");

    container.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content" style="width:480px">
        <div class="modal-header">
          <h2>General Store</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:var(--accent-gold);margin-bottom:12px">Gold: ${state.player.gold}</p>
          <h3>Buy</h3>
          <div class="activity-list">${stockRows || '<p class="activity-meta">No items in stock.</p>'}</div>
          <h3>Sell</h3>
          <div class="activity-list">${sellRows || '<p class="activity-meta">No sellable items in inventory.</p>'}</div>
        </div>
      </div>
    `;

    container
      .querySelector(".modal-close")!
      .addEventListener("click", () => uiStore.getState().closeModal());
    container
      .querySelector(".modal-backdrop")!
      .addEventListener("click", () => uiStore.getState().closeModal());

    container.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemId = (btn as HTMLElement).dataset.buy!;
        const state = gameStore.getState();
        const itemDef = getItem(itemId);
        if (!itemDef) return;
        const result = buyItem(
          state.player.gold,
          state.inventory,
          itemId,
          1,
          GENERAL_STORE,
          itemDef,
        );
        if (result.ok) {
          gameStore.getState().loadState({
            ...gameStore.getState(),
            player: { ...gameStore.getState().player, gold: result.gold },
            inventory: result.inventory,
          });
          render();
        }
      });
    });

    container.querySelectorAll("[data-sell]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemId = (btn as HTMLElement).dataset.sell!;
        const state = gameStore.getState();
        const itemDef = getItem(itemId);
        if (!itemDef) return;
        const result = sellItem(state.player.gold, state.inventory, itemId, 1, itemDef);
        if (result.ok) {
          gameStore.getState().loadState({
            ...gameStore.getState(),
            player: { ...gameStore.getState().player, gold: result.gold },
            inventory: result.inventory,
          });
          render();
        }
      });
    });
  }

  render();
}
