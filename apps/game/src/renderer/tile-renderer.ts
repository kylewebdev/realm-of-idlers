import type { GameMap, GameMapV2 } from "@realm-of-idlers/world";
import { ChunkRenderer } from "@realm-of-idlers/world";
import type { SceneContext } from "./scene.js";

/**
 * Manages tile rendering by wrapping the world package's ChunkRenderer.
 * Updates visible chunks as the player moves.
 */
export class TileRendererManager {
  private chunkRenderer: ChunkRenderer;
  private lastCol = -1;
  private lastRow = -1;

  constructor(sceneCtx: SceneContext, gameMap: GameMap | GameMapV2) {
    this.chunkRenderer = new ChunkRenderer(sceneCtx.scene, gameMap);
  }

  /** Update visible chunks if player has moved or textures need rebuilding. */
  update(playerCol: number, playerRow: number): void {
    const moved = playerCol !== this.lastCol || playerRow !== this.lastRow;
    if (!moved && !this.chunkRenderer.needsRebuild) return;
    this.lastCol = playerCol;
    this.lastRow = playerRow;
    this.chunkRenderer.updateVisibleChunks(playerCol, playerRow);
  }

  /** Animate water tiles. Call each frame with elapsed time. */
  updateWater(timeMs: number): void {
    this.chunkRenderer.updateWater(timeMs);
  }

  /** Tick chunk fade-in/fade-out animations. Call each frame with delta in ms. */
  updateFade(deltaMs: number): void {
    this.chunkRenderer.updateFade(deltaMs);
  }

  /** Get all active terrain meshes for raycasting against elevated terrain. */
  getTerrainMeshes(): import("three").Mesh[] {
    return this.chunkRenderer.getTerrainMeshes();
  }

  dispose(): void {
    this.chunkRenderer.dispose();
  }
}
