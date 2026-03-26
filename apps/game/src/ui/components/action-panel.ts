import { gameStore } from "@realm-of-idlers/state";

export function createActionPanel(container: HTMLElement): () => void {
  container.innerHTML = `
    <div class="action-info">
      <span class="action-label">Idle</span>
      <div class="action-bar"><div class="action-fill"></div></div>
    </div>
  `;

  const labelEl = container.querySelector(".action-label")!;
  const fillEl = container.querySelector(".action-fill") as HTMLElement;

  function update() {
    const state = gameStore.getState();
    const action = state.actionQueue[0];

    if (!action || action.type === "idle") {
      labelEl.textContent = "Idle";
      fillEl.style.width = "0%";
      return;
    }

    if (action.type === "gather") {
      labelEl.textContent = `Gathering: ${action.activityId}`;
      // Progress based on ticksRemaining (lower = more progress)
      const progress = action.ticksRemaining > 0 ? ((7 - action.ticksRemaining) / 7) * 100 : 100;
      fillEl.style.width = `${Math.max(0, progress)}%`;
    } else if (action.type === "craft") {
      labelEl.textContent = `Crafting: ${action.activityId}`;
      const progress = action.ticksRemaining > 0 ? ((5 - action.ticksRemaining) / 5) * 100 : 100;
      fillEl.style.width = `${Math.max(0, progress)}%`;
    } else if (action.type === "combat") {
      labelEl.textContent = `Fighting: ${action.monsterId}`;
      const counter = action.tickCounter ?? 0;
      fillEl.style.width = `${(counter / 4) * 100}%`;
    }
  }

  update();
  return gameStore.subscribe(update);
}
