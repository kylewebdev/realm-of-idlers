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

/** Darker variants for cliff/wall faces. */
const CLIFF_COLORS: Record<string, number> = {
  grass: 0x3a6230,
  dirt: 0x6b5640,
  stone: 0x666666,
  water: 0x2a5580,
};

/**
 * Renders visible tile chunks as Three.js meshes.
 *
 * Uses color-coded planes per terrain type as placeholders
 * until texture atlases are added in Step 8.
 */
/** Seconds for chunks to fade in/out. */
const CHUNK_FADE_DURATION = 0.35;

interface FadingChunk {
  group: THREE.Group;
  opacity: number;
  direction: "in" | "out";
  materials: THREE.MeshLambertMaterial[];
}

export class ChunkRenderer {
  private activeChunks = new Map<string, THREE.Group>();
  private fadingChunks = new Map<string, FadingChunk>();
  private materials: Record<string, THREE.MeshLambertMaterial>;
  private cliffMaterials: Record<string, THREE.MeshLambertMaterial>;
  private waterMaterial: THREE.MeshLambertMaterial;
  private waterBaseColor = new THREE.Color(0x3a6ea5);
  private waterAltColor = new THREE.Color(0x4a8ec5);

  constructor(
    private scene: THREE.Scene,
    private tiles: TileMap,
  ) {
    this.materials = {};
    this.cliffMaterials = {};
    for (const [terrain, color] of Object.entries(TERRAIN_COLORS)) {
      this.materials[terrain] = new THREE.MeshLambertMaterial({ color });
    }
    for (const [terrain, color] of Object.entries(CLIFF_COLORS)) {
      this.cliffMaterials[terrain] = new THREE.MeshLambertMaterial({ color });
    }
    // Water gets its own animated material
    this.waterMaterial = new THREE.MeshLambertMaterial({ color: 0x3a6ea5 });
    this.materials.water = this.waterMaterial;
  }

  /** Animate water color. Call each frame with elapsed time in ms. */
  updateWater(timeMs: number): void {
    const t = (Math.sin(timeMs * 0.002) + 1) * 0.5;
    this.waterMaterial.color.copy(this.waterBaseColor).lerp(this.waterAltColor, t);
  }

  /** Update which chunks are rendered based on player position. */
  updateVisibleChunks(centerCol: number, centerRow: number): void {
    const visible = getVisibleChunks(centerCol, centerRow, 4);
    const visibleKeys = new Set(visible.map((c) => chunkKey(c.chunkCol, c.chunkRow)));

    // Fade out chunks no longer visible
    for (const [key, group] of this.activeChunks) {
      if (!visibleKeys.has(key)) {
        this.activeChunks.delete(key);
        // Collect per-chunk materials for opacity control
        const mats = this.collectGroupMaterials(group);
        this.fadingChunks.set(key, { group, opacity: 1, direction: "out", materials: mats });
      }
    }

    // Add newly visible chunks (start transparent, fade in)
    for (const chunk of visible) {
      const key = chunkKey(chunk.chunkCol, chunk.chunkRow);
      if (!this.activeChunks.has(key)) {
        // If it was fading out, reverse it
        const existing = this.fadingChunks.get(key);
        if (existing) {
          existing.direction = "in";
          this.activeChunks.set(key, existing.group);
          continue;
        }

        const group = this.createChunkGroup(chunk.chunkCol, chunk.chunkRow);
        const mats = this.collectGroupMaterials(group);
        // Start fully transparent
        for (const mat of mats) {
          mat.transparent = true;
          mat.opacity = 0;
        }
        this.scene.add(group);
        this.activeChunks.set(key, group);
        this.fadingChunks.set(key, { group, opacity: 0, direction: "in", materials: mats });
      }
    }
  }

  /** Tick chunk fade animations. Call each frame with delta in ms. */
  updateFade(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const [key, fade] of this.fadingChunks) {
      const speed = 1 / CHUNK_FADE_DURATION;
      if (fade.direction === "in") {
        fade.opacity = Math.min(1, fade.opacity + speed * dt);
      } else {
        fade.opacity = Math.max(0, fade.opacity - speed * dt);
      }

      for (const mat of fade.materials) {
        mat.transparent = fade.opacity < 1;
        mat.opacity = fade.opacity;
      }

      // Done fading in — clean up
      if (fade.direction === "in" && fade.opacity >= 1) {
        this.fadingChunks.delete(key);
      }

      // Done fading out — remove from scene
      if (fade.direction === "out" && fade.opacity <= 0) {
        this.scene.remove(fade.group);
        this.fadingChunks.delete(key);
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
    for (const mat of Object.values(this.cliffMaterials)) {
      mat.dispose();
    }
  }

  /** Collect unique per-mesh materials from a chunk group (clones shared mats). */
  private collectGroupMaterials(group: THREE.Group): THREE.MeshLambertMaterial[] {
    const mats: THREE.MeshLambertMaterial[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        // Clone shared material so opacity changes don't affect other chunks
        const clone = child.material.clone();
        child.material = clone;
        mats.push(clone);
      }
    });
    return mats;
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

        // Add vertical cliff faces where this tile is higher than a neighbor.
        // PlaneGeometry faces +Z by default, so we rotate on Y to point outward.
        const neighbors: [number, number, number][] = [
          [col, row + 1, 0], // south neighbor → plane faces +Z (default)
          [col, row - 1, Math.PI], // north neighbor → face -Z
          [col + 1, row, Math.PI / 2], // east neighbor  → face +X
          [col - 1, row, -Math.PI / 2], // west neighbor  → face -X
        ];

        for (const [nc, nr, rotY] of neighbors) {
          const neighbor = getTile(this.tiles, nc, nr);
          const neighborElev = neighbor?.elevation ?? 0;
          const elevDiff = tile.elevation - neighborElev;
          if (elevDiff <= 0) continue;

          const wallHeight = elevDiff * 0.5;
          const wallGeo = new THREE.PlaneGeometry(1, wallHeight);
          const wallMat = this.cliffMaterials[tile.terrain] ?? this.cliffMaterials.stone!;
          const wallMesh = new THREE.Mesh(wallGeo, wallMat);

          // Position at the edge of this tile, halfway down the cliff
          const wallY = pos.y - wallHeight / 2;
          const wallX = pos.x + (nc - col) * 0.5;
          const wallZ = pos.z + (nr - row) * 0.5;
          wallMesh.position.set(wallX, wallY, wallZ);
          wallMesh.rotation.y = rotY;

          group.add(wallMesh);
        }
      }
    }

    return group;
  }
}

function chunkKey(chunkCol: number, chunkRow: number): string {
  return `${chunkCol},${chunkRow}`;
}
