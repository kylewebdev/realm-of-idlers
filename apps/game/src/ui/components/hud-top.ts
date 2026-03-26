import { gameStore } from "@realm-of-idlers/state";
import { totalLevel } from "@realm-of-idlers/state";

export function createHudTop(container: HTMLElement): () => void {
  container.innerHTML = `
    <span class="hud-name"></span>
    <span class="hud-separator">|</span>
    <span class="hud-level"></span>
    <span class="hud-separator">|</span>
    <span class="hud-gold"></span>
  `;

  const nameEl = container.querySelector(".hud-name")!;
  const levelEl = container.querySelector(".hud-level")!;
  const goldEl = container.querySelector(".hud-gold")!;

  function update() {
    const state = gameStore.getState();
    nameEl.textContent = state.player.name;
    levelEl.textContent = `Total Lv: ${totalLevel(state)}`;
    goldEl.textContent = `Gold: ${state.player.gold}`;
  }

  update();
  return gameStore.subscribe(update);
}
