import type { SkillType } from "@realm-of-idlers/shared";
import { xpForLevel, xpToNextLevel } from "@realm-of-idlers/shared";
import { gameStore } from "@realm-of-idlers/state";
import { getAvailableActivities } from "@realm-of-idlers/skills";
import type { GatherActivityDef, CraftActivityDef } from "@realm-of-idlers/engine";
import { uiStore } from "../store.js";

export function renderSkillDetail(container: HTMLElement, skill: SkillType): void {
  const state = gameStore.getState();
  const entry = state.skills[skill];
  const xpNext = xpToNextLevel(entry);
  const xpCurrent = xpForLevel(entry.level);
  const xpTarget = xpForLevel(entry.level + 1);
  const range = xpTarget - xpCurrent;
  const progress = range > 0 ? ((entry.xp - xpCurrent) / range) * 100 : 100;

  const activities = getAvailableActivities(skill, entry.level);

  container.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>${capitalize(skill)}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="skill-stats">
          <div>Level: <strong>${entry.level}</strong></div>
          <div>XP: ${entry.xp.toLocaleString()} / ${xpTarget.toLocaleString()}</div>
          <div>To next level: ${xpNext.toLocaleString()} XP</div>
          <div class="xp-bar large"><div class="xp-fill" style="width: ${progress}%"></div></div>
        </div>
        <h3>Activities</h3>
        <div class="activity-list">
          ${activities.length === 0 ? "<p>No activities available for this skill.</p>" : ""}
          ${activities.map((a) => renderActivity(a)).join("")}
        </div>
      </div>
    </div>
  `;

  // Wire close button
  container.querySelector(".modal-close")?.addEventListener("click", () => {
    uiStore.getState().closeModal();
  });
  container.querySelector(".modal-backdrop")?.addEventListener("click", () => {
    uiStore.getState().closeModal();
  });

  // Wire start buttons
  container.querySelectorAll("[data-start-activity]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activityId = (btn as HTMLElement).dataset.startActivity!;
      const activity = activities.find((a) => a.id === activityId);
      if (!activity) return;

      if ("inputs" in activity) {
        // Craft action
        gameStore.getState().setAction({
          type: "craft",
          activityId: activity.id,
          ticksRemaining: activity.baseTickDuration,
        });
      } else {
        // Gather action
        gameStore.getState().setAction({
          type: "gather",
          activityId: activity.id,
          nodeId: `node-${activity.id}`,
          ticksRemaining: activity.baseTickDuration,
        });
      }
      uiStore.getState().closeModal();
      uiStore.getState().pushEvent(`Started ${activity.id}`);
    });
  });
}

function renderActivity(a: GatherActivityDef | CraftActivityDef): string {
  const isGather = !("inputs" in a);
  const inputs = !isGather
    ? (a as CraftActivityDef).inputs.map((i) => `${i.itemId} x${i.quantity}`).join(", ")
    : "—";
  const outputs = a.outputs.map((o) => `${o.itemId} x${o.quantity}`).join(", ");

  return `
    <div class="activity-row">
      <div class="activity-info">
        <strong>${a.id}</strong>
        <span class="activity-meta">Lv ${a.levelRequired} | ${a.xpReward} XP | ${a.baseTickDuration} ticks</span>
        <span class="activity-io">${inputs} &rarr; ${outputs}</span>
      </div>
      <button class="btn-start" data-start-activity="${a.id}">Start</button>
    </div>
  `;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
