import type { OfflineSummary } from "@realm-of-idlers/engine";
import { uiStore } from "../store.js";

export function renderWelcomeBack(container: HTMLElement, summary: OfflineSummary): void {
  const xpLines = Object.entries(summary.xpGained)
    .filter(([, xp]) => xp > 0)
    .map(([skill, xp]) => `<li>${skill}: +${xp.toLocaleString()} XP</li>`)
    .join("");

  const levelLines = Object.entries(summary.levelsGained)
    .filter(([, lvls]) => lvls > 0)
    .map(([skill, lvls]) => `<li>${skill}: +${lvls} levels!</li>`)
    .join("");

  const itemLines = summary.itemsGained.map((i) => `<li>${i.itemId} x${i.quantity}</li>`).join("");

  container.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Welcome Back!</h2>
      </div>
      <div class="modal-body">
        <p>While you were away, ${summary.ticksProcessed.toLocaleString()} ticks were processed.</p>
        ${xpLines ? `<h3>XP Gained</h3><ul>${xpLines}</ul>` : ""}
        ${levelLines ? `<h3>Levels Gained</h3><ul>${levelLines}</ul>` : ""}
        ${itemLines ? `<h3>Items Gained</h3><ul>${itemLines}</ul>` : ""}
        ${!xpLines && !itemLines ? "<p>Nothing happened while you were idle.</p>" : ""}
        <button class="btn-continue">Continue</button>
      </div>
    </div>
  `;

  container.querySelector(".btn-continue")?.addEventListener("click", () => {
    uiStore.getState().closeModal();
  });
  container.querySelector(".modal-backdrop")?.addEventListener("click", () => {
    uiStore.getState().closeModal();
  });
}
