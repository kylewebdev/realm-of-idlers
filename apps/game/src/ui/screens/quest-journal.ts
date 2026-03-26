import { gameStore } from "@realm-of-idlers/state";
import { QUESTS } from "../../quests/registry.js";
import { checkQuestProgress, getAvailableQuests } from "../../quests/checker.js";
import { applyQuestRewards } from "../../quests/rewards.js";
import { uiStore } from "../store.js";
import { pushNotification } from "../render.js";

export function renderQuestJournal(container: HTMLElement): void {
  const state = gameStore.getState();
  const available = getAvailableQuests(state, QUESTS);
  const active = Object.entries(QUESTS).filter(([id]) => state.quests[id] === "active");
  const completed = Object.entries(QUESTS).filter(([id]) => state.quests[id] === "complete");
  const progress = checkQuestProgress(state, QUESTS);

  container.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Quest Journal</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${available.length > 0 ? `<h3>Available</h3>${available.map((q) => renderAvailableQuest(q.id, q.name, q.description)).join("")}` : ""}
        ${active.length > 0 ? `<h3>Active</h3>${active.map(([id]) => renderActiveQuest(id, progress)).join("")}` : ""}
        ${completed.length > 0 ? `<h3>Completed</h3>${completed.map(([id]) => renderCompletedQuest(id)).join("")}` : ""}
        ${available.length === 0 && active.length === 0 && completed.length === 0 ? "<p>No quests yet. Explore Briarwood!</p>" : ""}
      </div>
    </div>
  `;

  // Wire close
  container
    .querySelector(".modal-close")
    ?.addEventListener("click", () => uiStore.getState().closeModal());
  container
    .querySelector(".modal-backdrop")
    ?.addEventListener("click", () => uiStore.getState().closeModal());

  // Wire accept buttons
  container.querySelectorAll("[data-accept-quest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const questId = (btn as HTMLElement).dataset.acceptQuest!;
      gameStore.getState().setQuestStatus(questId, "active");
      pushNotification(`Quest accepted: ${QUESTS[questId]?.name}`);
      renderQuestJournal(container); // re-render
    });
  });

  // Wire claim buttons
  container.querySelectorAll("[data-claim-quest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const questId = (btn as HTMLElement).dataset.claimQuest!;
      const quest = QUESTS[questId];
      if (quest) {
        gameStore.getState().setQuestStatus(questId, "complete");
        applyQuestRewards(quest.rewards);
        pushNotification(`Quest complete: ${quest.name}!`);
        renderQuestJournal(container); // re-render
      }
    });
  });
}

function renderAvailableQuest(id: string, name: string, description: string): string {
  return `
    <div class="quest-row">
      <div class="quest-info">
        <strong>${name}</strong>
        <span class="quest-desc">${description}</span>
      </div>
      <button class="btn-start" data-accept-quest="${id}">Accept</button>
    </div>
  `;
}

function renderActiveQuest(id: string, progress: ReturnType<typeof checkQuestProgress>): string {
  const quest = QUESTS[id];
  if (!quest) return "";
  const questProgress = progress.find((p) => p.questId === id);
  const allDone = questProgress?.completed ?? false;

  const objHtml = (questProgress?.objectiveUpdates ?? [])
    .map((o) => {
      const done = o.current >= o.target;
      return `<div class="quest-objective ${done ? "done" : ""}">${o.objectiveId}: ${Math.min(o.current, o.target)}/${o.target} ${done ? "✓" : ""}</div>`;
    })
    .join("");

  return `
    <div class="quest-row">
      <div class="quest-info">
        <strong>${quest.name}</strong>
        ${objHtml}
      </div>
      ${allDone ? `<button class="btn-start" data-claim-quest="${id}">Claim</button>` : ""}
    </div>
  `;
}

function renderCompletedQuest(id: string): string {
  const quest = QUESTS[id];
  if (!quest) return "";
  return `
    <div class="quest-row completed">
      <div class="quest-info">
        <strong>${quest.name}</strong>
        <span class="quest-desc">Complete</span>
      </div>
    </div>
  `;
}
