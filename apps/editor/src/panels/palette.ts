import type { TerrainType } from "@realm-of-idlers/shared";
import { OBJECT_TYPES, WALL_TYPES } from "@realm-of-idlers/world";
import { editorStore } from "../state/editor-store.js";

const TERRAINS: { id: TerrainType; label: string; color: string }[] = [
  { id: "grass", label: "Grass", color: "#4a7c3f" },
  { id: "dirt", label: "Dirt", color: "#8b7355" },
  { id: "stone", label: "Stone", color: "#888888" },
  { id: "water", label: "Water", color: "#3a6ea5" },
];

export function initPalette(container: HTMLElement): void {
  container.innerHTML = `
    <div class="palette-section" id="palette-terrain">
      <h3>Terrain</h3>
      <div class="palette-grid"></div>
    </div>
    <div class="palette-section" id="palette-objects">
      <h3>Objects</h3>
      <div class="palette-grid"></div>
    </div>
    <div class="palette-section" id="palette-walls">
      <h3>Walls</h3>
      <div class="palette-grid"></div>
    </div>
    <div class="palette-section" id="palette-layers">
      <h3>Layers</h3>
      <label><input type="checkbox" id="toggle-grid" checked> Grid</label>
      <label><input type="checkbox" id="toggle-objects" checked> Objects</label>
      <label><input type="checkbox" id="toggle-walls" checked> Walls</label>
      <label><input type="checkbox" id="toggle-spawns" checked> Spawn Zones</label>
    </div>
  `;

  // Terrain palette
  const terrainGrid = container.querySelector("#palette-terrain .palette-grid")!;
  for (const t of TERRAINS) {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.dataset.terrain = t.id;
    btn.innerHTML = `<span class="palette-swatch" style="background:${t.color}"></span>${t.label}`;
    btn.addEventListener("click", () => {
      editorStore.getState().setSelectedTerrain(t.id);
      editorStore.getState().setTool("terrain");
    });
    terrainGrid.appendChild(btn);
  }

  // Object palette
  const objGrid = container.querySelector("#palette-objects .palette-grid")!;
  for (const [id, def] of Object.entries(OBJECT_TYPES)) {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.dataset.objectType = id;
    const color = `#${def.fallbackColor.toString(16).padStart(6, "0")}`;
    btn.innerHTML = `<span class="palette-swatch" style="background:${color}"></span>${def.label}`;
    btn.addEventListener("click", () => {
      editorStore.getState().setSelectedObjectType(id);
      editorStore.getState().setTool("object");
    });
    objGrid.appendChild(btn);
  }

  // Wall palette
  const wallGrid = container.querySelector("#palette-walls .palette-grid")!;
  for (const [id, def] of Object.entries(WALL_TYPES)) {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.dataset.wallType = id;
    const color = `#${def.fallbackColor.toString(16).padStart(6, "0")}`;
    btn.innerHTML = `<span class="palette-swatch" style="background:${color}"></span>${def.label}`;
    btn.addEventListener("click", () => {
      editorStore.getState().setSelectedWallType(id);
      editorStore.getState().setTool("wall");
    });
    wallGrid.appendChild(btn);
  }

  // Layer toggles
  container
    .querySelector("#toggle-grid")!
    .addEventListener("change", () => editorStore.getState().toggleGrid());
  container
    .querySelector("#toggle-objects")!
    .addEventListener("change", () => editorStore.getState().toggleObjects());
  container
    .querySelector("#toggle-walls")!
    .addEventListener("change", () => editorStore.getState().toggleWalls());
  container
    .querySelector("#toggle-spawns")!
    .addEventListener("change", () => editorStore.getState().toggleSpawnZones());

  // Highlight active selections
  editorStore.subscribe(() => {
    const { selectedTerrain, selectedObjectType, selectedWallType, activeTool } =
      editorStore.getState();
    for (const btn of terrainGrid.querySelectorAll(".palette-btn")) {
      (btn as HTMLElement).classList.toggle(
        "active",
        activeTool === "terrain" && (btn as HTMLElement).dataset.terrain === selectedTerrain,
      );
    }
    for (const btn of objGrid.querySelectorAll(".palette-btn")) {
      (btn as HTMLElement).classList.toggle(
        "active",
        activeTool === "object" && (btn as HTMLElement).dataset.objectType === selectedObjectType,
      );
    }
    for (const btn of wallGrid.querySelectorAll(".palette-btn")) {
      (btn as HTMLElement).classList.toggle(
        "active",
        activeTool === "wall" && (btn as HTMLElement).dataset.wallType === selectedWallType,
      );
    }
  });
}
