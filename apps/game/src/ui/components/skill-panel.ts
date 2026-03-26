import type { SkillType } from "@realm-of-idlers/shared";
import { xpForLevel } from "@realm-of-idlers/shared";
import { gameStore } from "@realm-of-idlers/state";
import { uiStore } from "../store.js";

const SKILLS: SkillType[] = [
  "woodcutting",
  "mining",
  "fishing",
  "smithing",
  "cooking",
  "attack",
  "strength",
  "hitpoints",
  "stamina",
];

export function createSkillPanel(container: HTMLElement): () => void {
  container.innerHTML = `<h3 class="panel-title">Skills</h3><div class="skill-list"></div>`;
  const list = container.querySelector(".skill-list")!;

  for (const skill of SKILLS) {
    const row = document.createElement("div");
    row.className = "skill-row";
    row.dataset.skill = skill;
    row.innerHTML = `
      <span class="skill-name">${capitalize(skill)}</span>
      <span class="skill-level"></span>
      <div class="xp-bar"><div class="xp-fill"></div></div>
    `;
    row.addEventListener("click", () => {
      uiStore.getState().selectSkill(skill);
    });
    list.appendChild(row);
  }

  function update() {
    const state = gameStore.getState();
    const currentAction = state.actionQueue[0];

    for (const skill of SKILLS) {
      const row = list.querySelector(`[data-skill="${skill}"]`) as HTMLElement;
      if (!row) continue;
      const entry = state.skills[skill];
      const levelEl = row.querySelector(".skill-level")!;
      const fillEl = row.querySelector(".xp-fill") as HTMLElement;

      levelEl.textContent = `${entry.level}`;

      // XP progress within current level
      const xpForCurrent = xpForLevel(entry.level);
      const xpForNext = xpForLevel(entry.level + 1);
      const range = xpForNext - xpForCurrent;
      const progress = range > 0 ? ((entry.xp - xpForCurrent) / range) * 100 : 100;
      fillEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;

      // Highlight active skill
      const isActive = currentAction?.type === "gather" || currentAction?.type === "craft";
      row.classList.toggle("active", isActive);
    }
  }

  update();
  return gameStore.subscribe(update);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
