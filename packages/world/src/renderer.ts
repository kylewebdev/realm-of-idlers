import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { TileMap } from "./types.js";
import { getChunkTiles, getVisibleChunks } from "./chunks.js";
import { getTile } from "./briarwood.js";

const TERRAIN_COLORS: Record<string, number> = {
  grass: 0x4a7c3f,
  dirt: 0x8b7355,
  stone: 0x888888,
  water: 0x3a6ea5,
};

/**
 * Renders visible tile chunks as Three.js meshes.
 *
 * Uses color-coded planes per terrain type as placeholders
 * until texture atlases are added in Step 8.
 */
export class ChunkRenderer {
  private activeChunks = new Map<string, THREE.Group>();
  private materials: Record<string, THREE.MeshLambertMaterial>;

  constructor(
    private scene: THREE.Scene,
    private tiles: TileMap,
  ) {
    this.materials = {};
    for (const [terrain, color] of Object.entries(TERRAIN_COLORS)) {
      this.materials[terrain] = new THREE.MeshLambertMaterial({ color });
    }
  }

  /** Update which chunks are rendered based on player position. */
  updateVisibleChunks(centerCol: number, centerRow: number): void {
    const visible = getVisibleChunks(centerCol, centerRow, 2);
    const visibleKeys = new Set(visible.map((c) => chunkKey(c.chunkCol, c.chunkRow)));

    // Remove chunks no longer visible
    for (const [key, group] of this.activeChunks) {
      if (!visibleKeys.has(key)) {
        this.scene.remove(group);
        this.activeChunks.delete(key);
      }
    }

    // Add newly visible chunks
    for (const chunk of visible) {
      const key = chunkKey(chunk.chunkCol, chunk.chunkRow);
      if (!this.activeChunks.has(key)) {
        const group = this.createChunkGroup(chunk.chunkCol, chunk.chunkRow);
        this.scene.add(group);
        this.activeChunks.set(key, group);
      }
    }
  }

  /** Clean up all Three.js resources. */
  dispose(): void {
    for (const [, group] of this.activeChunks) {
      this.scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }
    this.activeChunks.clear();

    for (const mat of Object.values(this.materials)) {
      mat.dispose();
    }
  }

  private createChunkGroup(chunkCol: number, chunkRow: number): THREE.Group {
    const group = new THREE.Group();
    const { startCol, startRow, endCol, endRow } = getChunkTiles(chunkCol, chunkRow);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = getTile(this.tiles, col, row);
        if (!tile) continue;

        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = this.materials[tile.terrain] ?? this.materials.grass!;
        const mesh = new THREE.Mesh(geometry, material);

        const pos = tileToWorld(col, row, tile.elevation);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.x = -Math.PI / 2; // lay flat

        group.add(mesh);
      }
    }

    return group;
  }
}

function chunkKey(chunkCol: number, chunkRow: number): string {
  return `${chunkCol},${chunkRow}`;
}
