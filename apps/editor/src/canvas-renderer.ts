import { OBJECT_TYPES, WALL_TYPES } from "@realm-of-idlers/world";
import { editorStore } from "./state/editor-store.js";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#4a7c3f",
  dirt: "#8b7355",
  stone: "#888888",
  water: "#3a6ea5",
};

const ELEVATION_SHADES = [0, -20, -40, -60]; // darken per elevation level

const TILE_SIZE = 24; // base pixels per tile at zoom=1

export class EditorCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  start(): void {
    const loop = () => {
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.animId);
  }

  /** Convert screen coords to tile coords. */
  screenToTile(sx: number, sy: number): { col: number; row: number } | null {
    const { map } = editorStore.getState();
    if (!map) return null;
    const { x: camX, y: camY, zoom } = editorStore.getState().camera;
    const tileSize = TILE_SIZE * zoom;
    const offsetX = this.canvas.width / 2 - camX * tileSize;
    const offsetY = this.canvas.height / 2 - camY * tileSize;
    const col = Math.floor((sx - offsetX) / tileSize);
    const row = Math.floor((sy - offsetY) / tileSize);
    if (col < 0 || col >= map.meta.width || row < 0 || row >= map.meta.height) return null;
    return { col, row };
  }

  /** Detect which edge of a tile the mouse is near (for wall tool). */
  screenToEdge(
    sx: number,
    sy: number,
  ): { col: number; row: number; edge: "north" | "south" | "east" | "west" } | null {
    const { map } = editorStore.getState();
    if (!map) return null;
    const { x: camX, y: camY, zoom } = editorStore.getState().camera;
    const tileSize = TILE_SIZE * zoom;
    const offsetX = this.canvas.width / 2 - camX * tileSize;
    const offsetY = this.canvas.height / 2 - camY * tileSize;

    const col = Math.floor((sx - offsetX) / tileSize);
    const row = Math.floor((sy - offsetY) / tileSize);
    if (col < 0 || col >= map.meta.width || row < 0 || row >= map.meta.height) return null;

    // Position within the tile (0..1)
    const fx = (sx - offsetX) / tileSize - col;
    const fy = (sy - offsetY) / tileSize - row;

    const edgeThreshold = 0.2;
    if (fy < edgeThreshold) return { col, row, edge: "north" };
    if (fy > 1 - edgeThreshold) return { col, row, edge: "south" };
    if (fx < edgeThreshold) return { col, row, edge: "west" };
    if (fx > 1 - edgeThreshold) return { col, row, edge: "east" };

    return null; // center of tile, not an edge
  }

  private render(): void {
    const state = editorStore.getState();
    const { map } = state;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!map) {
      ctx.fillStyle = "#888";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "No map loaded. Create new or load a file.",
        this.canvas.width / 2,
        this.canvas.height / 2,
      );
      return;
    }

    const { x: camX, y: camY, zoom } = state.camera;
    const tileSize = TILE_SIZE * zoom;
    const offsetX = this.canvas.width / 2 - camX * tileSize;
    const offsetY = this.canvas.height / 2 - camY * tileSize;

    // Visible tile range
    const startCol = Math.max(0, Math.floor(-offsetX / tileSize));
    const startRow = Math.max(0, Math.floor(-offsetY / tileSize));
    const endCol = Math.min(
      map.meta.width - 1,
      Math.floor((this.canvas.width - offsetX) / tileSize),
    );
    const endRow = Math.min(
      map.meta.height - 1,
      Math.floor((this.canvas.height - offsetY) / tileSize),
    );

    // Draw ground layer
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = map.ground[row]?.[col];
        if (!cell) continue;

        const x = col * tileSize + offsetX;
        const y = row * tileSize + offsetY;

        // Terrain color with elevation shade
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain] ?? "#ff00ff";
        ctx.fillRect(x, y, tileSize, tileSize);

        // Elevation darkening
        if (cell.elevation > 0) {
          const shade = ELEVATION_SHADES[cell.elevation] ?? 0;
          ctx.fillStyle = `rgba(0,0,0,${Math.abs(shade) / 100})`;
          ctx.fillRect(x, y, tileSize, tileSize);
        }

        // Elevation label
        if (cell.elevation > 0 && tileSize >= 16) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = `${Math.max(8, tileSize * 0.3)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(`${cell.elevation}`, x + tileSize / 2, y + tileSize / 2 + 3);
        }
      }
    }

    // Draw grid
    if (state.showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let row = startRow; row <= endRow + 1; row++) {
        const y = row * tileSize + offsetY;
        ctx.beginPath();
        ctx.moveTo(startCol * tileSize + offsetX, y);
        ctx.lineTo((endCol + 1) * tileSize + offsetX, y);
        ctx.stroke();
      }
      for (let col = startCol; col <= endCol + 1; col++) {
        const x = col * tileSize + offsetX;
        ctx.beginPath();
        ctx.moveTo(x, startRow * tileSize + offsetY);
        ctx.lineTo(x, (endRow + 1) * tileSize + offsetY);
        ctx.stroke();
      }
    }

    // Draw objects
    if (state.showObjects) {
      for (const obj of map.objects) {
        if (obj.col < startCol || obj.col > endCol || obj.row < startRow || obj.row > endRow)
          continue;
        const x = obj.col * tileSize + offsetX;
        const y = obj.row * tileSize + offsetY;
        const typeDef = OBJECT_TYPES[obj.typeId];
        const color = typeDef
          ? `#${typeDef.fallbackColor.toString(16).padStart(6, "0")}`
          : "#ff00ff";

        ctx.fillStyle = color;
        const inset = tileSize * 0.15;
        ctx.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);

        // Label
        if (tileSize >= 20) {
          ctx.fillStyle = "#fff";
          ctx.font = `${Math.max(7, tileSize * 0.25)}px sans-serif`;
          ctx.textAlign = "center";
          const label = typeDef?.label.slice(0, 4) ?? obj.typeId.slice(0, 4);
          ctx.fillText(label, x + tileSize / 2, y + tileSize / 2 + 3);
        }

        // Highlight selected
        if (state.selectedObject === obj) {
          ctx.strokeStyle = "#ffd666";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
      }
    }

    // Draw walls
    if (state.showWalls) {
      for (const wall of map.walls) {
        if (
          wall.col < startCol - 1 ||
          wall.col > endCol + 1 ||
          wall.row < startRow - 1 ||
          wall.row > endRow + 1
        )
          continue;
        const x = wall.col * tileSize + offsetX;
        const y = wall.row * tileSize + offsetY;
        const wallDef = WALL_TYPES[wall.wallTypeId];
        const color = wallDef
          ? `#${wallDef.fallbackColor.toString(16).padStart(6, "0")}`
          : "#ff00ff";

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, tileSize * 0.12);
        ctx.beginPath();
        switch (wall.edge) {
          case "north":
            ctx.moveTo(x, y);
            ctx.lineTo(x + tileSize, y);
            break;
          case "south":
            ctx.moveTo(x, y + tileSize);
            ctx.lineTo(x + tileSize, y + tileSize);
            break;
          case "west":
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + tileSize);
            break;
          case "east":
            ctx.moveTo(x + tileSize, y);
            ctx.lineTo(x + tileSize, y + tileSize);
            break;
        }
        ctx.stroke();
      }
    }

    // Draw spawn zones
    if (state.showSpawnZones) {
      ctx.strokeStyle = "rgba(204, 51, 51, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const zone of map.spawnZones) {
        const x = zone.rect.colStart * tileSize + offsetX;
        const y = zone.rect.rowStart * tileSize + offsetY;
        const w = (zone.rect.colEnd - zone.rect.colStart + 1) * tileSize;
        const h = (zone.rect.rowEnd - zone.rect.rowStart + 1) * tileSize;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "rgba(204, 51, 51, 0.15)";
        ctx.fillRect(x, y, w, h);
        if (tileSize >= 12) {
          ctx.fillStyle = "#cc3333";
          ctx.font = `${Math.max(8, tileSize * 0.4)}px sans-serif`;
          ctx.textAlign = "left";
          ctx.fillText(zone.monsterId, x + 4, y + 14);
        }
      }
      ctx.setLineDash([]);
    }
  }
}
