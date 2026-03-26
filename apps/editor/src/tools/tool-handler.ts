import { editorStore } from "../state/editor-store.js";
import { OBJECT_TYPES } from "@realm-of-idlers/world";
import type { EditorCanvasRenderer } from "../canvas-renderer.js";

export function initToolHandler(canvas: HTMLCanvasElement, renderer: EditorCanvasRenderer): void {
  let isDown = false;
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };

  function handleToolAction(sx: number, sy: number, button: number): void {
    const state = editorStore.getState();
    const { map, activeTool } = state;
    if (!map) return;

    if (activeTool === "terrain") {
      const tile = renderer.screenToTile(sx, sy);
      if (tile) {
        const { brushSize, selectedTerrain } = state;
        const half = Math.floor(brushSize / 2);
        for (let dr = -half; dr <= half; dr++) {
          for (let dc = -half; dc <= half; dc++) {
            editorStore.getState().setTerrain(tile.col + dc, tile.row + dr, selectedTerrain);
          }
        }
      }
    } else if (activeTool === "elevation") {
      const tile = renderer.screenToTile(sx, sy);
      if (tile) {
        const delta = button === 2 ? -1 : 1;
        editorStore.getState().setElevation(tile.col, tile.row, delta);
      }
    } else if (activeTool === "object") {
      const tile = renderer.screenToTile(sx, sy);
      if (tile) {
        const { selectedObjectType } = state;
        const typeDef = OBJECT_TYPES[selectedObjectType];
        editorStore.getState().placeObject({
          col: tile.col,
          row: tile.row,
          typeId: selectedObjectType,
          blocking: typeDef?.defaultBlocking ?? true,
        });
      }
    } else if (activeTool === "wall") {
      const edge = renderer.screenToEdge(sx, sy);
      if (edge) {
        editorStore.getState().placeWall(edge.col, edge.row, edge.edge, state.selectedWallType);
      }
    } else if (activeTool === "eraser") {
      const tile = renderer.screenToTile(sx, sy);
      if (tile) {
        editorStore.getState().removeObject(tile.col, tile.row);
      }
      // Also try removing walls
      const edge = renderer.screenToEdge(sx, sy);
      if (edge) {
        editorStore.getState().removeWall(edge.col, edge.row, edge.edge);
      }
    } else if (activeTool === "select") {
      const tile = renderer.screenToTile(sx, sy);
      if (tile && map) {
        const obj = map.objects.find((o) => o.col === tile.col && o.row === tile.row) ?? null;
        editorStore.getState().selectObject(obj);
      }
    }
  }

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or alt+click = pan
      isPanning = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }
    isDown = true;
    handleToolAction(e.offsetX, e.offsetY, e.button);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isPanning) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
      const { camera } = editorStore.getState();
      const tileSize = 24 * camera.zoom;
      editorStore.getState().setCamera({
        x: camera.x - dx / tileSize,
        y: camera.y - dy / tileSize,
      });
      return;
    }
    if (isDown) {
      const { activeTool } = editorStore.getState();
      // Continuous painting for terrain and eraser
      if (activeTool === "terrain" || activeTool === "eraser") {
        handleToolAction(e.offsetX, e.offsetY, 0);
      }
    }
  });

  canvas.addEventListener("mouseup", () => {
    isDown = false;
    isPanning = false;
  });

  canvas.addEventListener("mouseleave", () => {
    isDown = false;
    isPanning = false;
  });

  // Right-click for elevation down
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const { activeTool } = editorStore.getState();
    if (activeTool === "elevation") {
      handleToolAction(e.offsetX, e.offsetY, 2);
    }
  });

  // Zoom with scroll wheel
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const { camera } = editorStore.getState();
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.25, Math.min(4, camera.zoom + zoomDelta));
      editorStore.getState().setCamera({ zoom: newZoom });
    },
    { passive: false },
  );
}
