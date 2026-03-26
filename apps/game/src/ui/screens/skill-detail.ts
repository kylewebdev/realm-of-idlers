import type { SkillType, TileCoord } from "@realm-of-idlers/shared";
import { MAP_SIZE, xpForLevel, xpToNextLevel } from "@realm-of-idlers/shared";
import { gameStore } from "@realm-of-idlers/state";
import { getAvailableActivities } from "@realm-of-idlers/skills";
import type { GatherActivityDef, CraftActivityDef } from "@realm-of-idlers/engine";
import { uiStore } from "../store.js";

/** Find the nearest resource node on the map matching an activity ID. */
function findNearestNode(
  tiles: any[][],
  activityId: string,
  playerPos: TileCoord,
): { nodeId: string; tile: TileCoord } | null {
  let best: { nodeId: string; tile: TileCoord; dist: number } | null = null;

  for (let row = 0; row < MAP_SIZE; row++) {
    for (let col = 0; col < MAP_SIZE; col++) {
      const t = tiles[row]?.[col];
      if (t?.resourceNode?.activityId === activityId) {
        const dist = Math.abs(col - playerPos.col) + Math.abs(row - playerPos.row);
        if (!best || dist < best.dist) {
          best = { nodeId: t.resourceNode.nodeId, tile: { col, row }, dist };
        }
      }
    }
  }

  return best ? { nodeId: best.nodeId, tile: best.tile } : null;
}

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

  // Wire start buttons — find nearest node and walk to it
  container.querySelectorAll("[data-start-activity]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activityId = (btn as HTMLElement).dataset.startActivity!;
      const activity = activities.find((a) => a.id === activityId);
      if (!activity) return;

      if ("inputs" in activity) {
        // Craft actions don't need a world location — start immediately
        // (crafting happens at structures like forge/cooking-range)
        gameStore.getState().setAction({
          type: "craft",
          activityId: activity.id,
          ticksRemaining: activity.baseTickDuration,
        });
        uiStore.getState().closeModal();
        uiStore.getState().pushEvent(`Started ${activity.id}`);
      } else {
        // Gather action — find nearest resource node on the map
        const walkTo = (window as any).__walkToActivity as
          | ((
              activityId: string,
              nodeId: string,
              target: { col: number; row: number },
              ticks: number,
            ) => void)
          | undefined;
        const mapData = (window as any).__briarwoodMap as { tiles: any[][] } | undefined;

        if (walkTo && mapData) {
          const nearest = findNearestNode(
            mapData.tiles,
            activityId,
            gameStore.getState().player.position,
          );
          if (nearest) {
            walkTo(activityId, nearest.nodeId, nearest.tile, activity.baseTickDuration);
            uiStore.getState().closeModal();
          } else {
            uiStore.getState().pushEvent("No accessible resource node found for this activity.");
          }
        }
      }
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
