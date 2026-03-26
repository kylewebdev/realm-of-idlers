import type { TileMap } from "@realm-of-idlers/world";
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

  constructor(sceneCtx: SceneContext, tiles: TileMap) {
    this.chunkRenderer = new ChunkRenderer(sceneCtx.scene, tiles);
  }

  /** Update visible chunks if player has moved to a new tile. */
  update(playerCol: number, playerRow: number): void {
    if (playerCol === this.lastCol && playerRow === this.lastRow) return;
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

  dispose(): void {
    this.chunkRenderer.dispose();
  }
}
