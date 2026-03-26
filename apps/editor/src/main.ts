import "./style.css";
import { editorStore } from "./state/editor-store.js";
import { EditorCanvasRenderer } from "./canvas-renderer.js";
import { initToolbar } from "./panels/toolbar.js";
import { initPalette } from "./panels/palette.js";
import { initToolHandler } from "./tools/tool-handler.js";

function main(): void {
  const toolbar = document.getElementById("toolbar");
  const palette = document.getElementById("palette-panel");
  const canvasEl = document.getElementById("editor-canvas") as HTMLCanvasElement;
  const properties = document.getElementById("properties-panel");
  const statusBar = document.getElementById("status-bar");

  if (!toolbar || !palette || !canvasEl || !properties || !statusBar) {
    throw new Error("Missing editor DOM elements");
  }

  // Init panels
  initToolbar(toolbar);
  initPalette(palette);

  // Init canvas renderer
  const renderer = new EditorCanvasRenderer(canvasEl);
  renderer.start();

  // Init tool handler (mouse/keyboard → editor actions)
  initToolHandler(canvasEl, renderer);

  // Properties panel — show selected object info
  editorStore.subscribe(() => {
    const { selectedObject, map, activeTool, camera } = editorStore.getState();
    if (selectedObject) {
      properties.innerHTML = `
        <h3 style="color:var(--accent);margin-bottom:8px">Selected Object</h3>
        <div>Type: ${selectedObject.typeId}</div>
        <div>Position: ${selectedObject.col}, ${selectedObject.row}</div>
        <div>Blocking: ${selectedObject.blocking}</div>
        ${selectedObject.interaction ? `<div>Interaction: ${selectedObject.interaction.kind}</div>` : ""}
      `;
    } else {
      properties.innerHTML = `
        <h3 style="color:var(--accent);margin-bottom:8px">Properties</h3>
        <div style="color:rgba(224,224,224,0.5)">Select an object to view properties</div>
      `;
    }

    // Update status bar
    const mapInfo = map ? `${map.meta.name} (${map.meta.width}x${map.meta.height})` : "No map";
    const objCount = map ? `${map.objects.length} objects` : "";
    const wallCount = map ? `${map.walls.length} walls` : "";
    const zoomPct = `${Math.round(camera.zoom * 100)}%`;
    statusBar.textContent = `${mapInfo}  |  ${objCount}  |  ${wallCount}  |  Tool: ${activeTool}  |  Zoom: ${zoomPct}`;
  });

  // Load briarwood by default (try fetching from game's public dir)
  fetch("/maps/briarwood.json")
    .then((r) => r.json())
    .then((map) => {
      editorStore.getState().loadMap(map);
      // Center camera on map
      editorStore.getState().setCamera({ x: map.meta.width / 2, y: map.meta.height / 2 });
      console.log(`[editor] Loaded ${map.meta.name}`);
    })
    .catch(() => {
      console.log("[editor] No default map found. Use New or Load.");
    });
}

main();
