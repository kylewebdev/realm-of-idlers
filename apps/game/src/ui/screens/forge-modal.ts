import { gameStore } from "@realm-of-idlers/state";
import { getItem, hasItem } from "@realm-of-idlers/items";
import { CRAFT_ACTIVITIES } from "@realm-of-idlers/skills";
import { uiStore } from "../store.js";

const SMITHING_RECIPES = Object.values(CRAFT_ACTIVITIES).filter((a) => a.skill === "smithing");

export function renderForgeModal(container: HTMLElement): void {
  const state = gameStore.getState();
  const smithingLevel = state.skills.smithing.level;

  const recipes = SMITHING_RECIPES.map((recipe) => {
    const meetsLevel = smithingLevel >= recipe.levelRequired;
    const hasInputs = recipe.inputs.every((inp) =>
      hasItem(state.inventory, inp.itemId, inp.quantity),
    );
    const canStart = meetsLevel && hasInputs;

    const inputStr = recipe.inputs
      .map((inp) => {
        const def = getItem(inp.itemId);
        return `${inp.quantity}x ${def?.name ?? inp.itemId}`;
      })
      .join(", ");

    const outputStr = recipe.outputs
      .map((out) => {
        const def = getItem(out.itemId);
        return `${out.quantity}x ${def?.name ?? out.itemId}`;
      })
      .join(", ");

    return `
      <div class="activity-row" style="${canStart ? "" : "opacity:0.5"}">
        <div class="activity-info">
          <span>${recipe.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          <span class="activity-meta">Level ${recipe.levelRequired} | ${recipe.xpReward} XP | ${recipe.baseTickDuration} ticks</span>
          <span class="activity-io">In: ${inputStr} &rarr; Out: ${outputStr}</span>
        </div>
        ${canStart ? `<button class="btn-start" data-craft="${recipe.id}">Start</button>` : `<span class="activity-meta">${!meetsLevel ? "Level too low" : "Missing materials"}</span>`}
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Forge</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size:12px;color:rgba(244,228,193,0.6);margin-bottom:12px">Smithing Level: ${smithingLevel}</p>
        <div class="activity-list">${recipes}</div>
      </div>
    </div>
  `;

  container
    .querySelector(".modal-close")!
    .addEventListener("click", () => uiStore.getState().closeModal());
  container
    .querySelector(".modal-backdrop")!
    .addEventListener("click", () => uiStore.getState().closeModal());

  container.querySelectorAll("[data-craft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activityId = (btn as HTMLElement).dataset.craft!;
      const recipe = CRAFT_ACTIVITIES[activityId]!;
      gameStore.getState().setAction({
        type: "craft",
        activityId,
        ticksRemaining: recipe.baseTickDuration,
      });
      uiStore.getState().closeModal();
    });
  });
}
