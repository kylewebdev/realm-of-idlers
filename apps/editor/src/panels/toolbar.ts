import { editorStore } from "../state/editor-store.js";
import type { EditorTool } from "../state/editor-store.js";

const TOOLS: { id: EditorTool; label: string; key: string }[] = [
  { id: "terrain", label: "Terrain", key: "T" },
  { id: "elevation", label: "Elevation", key: "V" },
  { id: "object", label: "Object", key: "O" },
  { id: "wall", label: "Wall", key: "W" },
  { id: "eraser", label: "Eraser", key: "X" },
  { id: "spawn", label: "Spawn", key: "Z" },
  { id: "select", label: "Select", key: "S" },
];

export function initToolbar(container: HTMLElement): void {
  const toolBtns = document.createElement("div");
  toolBtns.className = "toolbar-tools";

  for (const tool of TOOLS) {
    const btn = document.createElement("button");
    btn.className = "tool-btn";
    btn.dataset.tool = tool.id;
    btn.textContent = `${tool.label} (${tool.key})`;
    btn.addEventListener("click", () => editorStore.getState().setTool(tool.id));
    toolBtns.appendChild(btn);
  }

  const actions = document.createElement("div");
  actions.className = "toolbar-actions";
  actions.innerHTML = `
    <button id="btn-new">New</button>
    <button id="btn-load">Load</button>
    <button id="btn-save">Save</button>
    <button id="btn-undo">Undo</button>
    <button id="btn-redo">Redo</button>
  `;

  container.appendChild(toolBtns);
  container.appendChild(actions);

  // Wire action buttons
  actions.querySelector("#btn-new")!.addEventListener("click", () => {
    const name = prompt("Map name:", "New Map") ?? "New Map";
    const width = parseInt(prompt("Width:", "64") ?? "64", 10);
    const height = parseInt(prompt("Height:", "64") ?? "64", 10);
    editorStore.getState().newMap(width, height, name);
  });

  actions.querySelector("#btn-load")!.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const map = JSON.parse(text);
      editorStore.getState().loadMap(map);
    });
    input.click();
  });

  actions.querySelector("#btn-save")!.addEventListener("click", () => {
    const { map } = editorStore.getState();
    if (!map) return;
    const json = JSON.stringify(map);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${map.meta.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  actions
    .querySelector("#btn-undo")!
    .addEventListener("click", () => editorStore.getState().undo());
  actions
    .querySelector("#btn-redo")!
    .addEventListener("click", () => editorStore.getState().redo());

  // Keyboard shortcuts for tools
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (key === "z" && e.shiftKey) {
        editorStore.getState().redo();
        e.preventDefault();
      } else if (key === "z") {
        editorStore.getState().undo();
        e.preventDefault();
      }
      return;
    }
    const tool = TOOLS.find((t) => t.key.toLowerCase() === key);
    if (tool) editorStore.getState().setTool(tool.id);
  });

  // Update active tool highlight
  editorStore.subscribe(() => {
    const { activeTool } = editorStore.getState();
    for (const btn of toolBtns.querySelectorAll(".tool-btn")) {
      (btn as HTMLElement).classList.toggle(
        "active",
        (btn as HTMLElement).dataset.tool === activeTool,
      );
    }
  });
}
