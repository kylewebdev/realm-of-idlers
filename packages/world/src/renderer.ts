import * as THREE from "three";
import { tileToWorld } from "@realm-of-idlers/shared";
import type { TileMap } from "./types.js";
import { getChunkTiles, getVisibleChunks } from "./chunks.js";
import { getTile } from "./briarwood.js";

/** Fallback colors if textures aren't loaded yet. */
const TERRAIN_COLORS: Record<string, number> = {
  grass: 0x4a7c3f,
  dirt: 0x8b7355,
  stone: 0x888888,
  water: 0x3a6ea5,
};

const CLIFF_COLORS: Record<string, number> = {
  grass: 0x3a6230,
  dirt: 0x6b5640,
  stone: 0x666666,
  water: 0x2a5580,
};

const TERRAIN_TYPES = ["grass", "dirt", "stone", "water"] as const;

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
  materials: THREE.MeshBasicMaterial[];
}

export class ChunkRenderer {
  private activeChunks = new Map<string, THREE.Group>();
  private fadingChunks = new Map<string, FadingChunk>();
  /** Loaded textures — shared across all chunk materials. */
  private terrainTextures: Record<string, THREE.Texture | null> = {};
  private cliffTextures: Record<string, THREE.Texture | null> = {};
  /** Fallback colors used until textures load. */
  private terrainColors = TERRAIN_COLORS;
  private cliffColorMap = CLIFF_COLORS;
  private pendingRebuild = false;

  constructor(
    private scene: THREE.Scene,
    private tiles: TileMap,
  ) {
    const loader = new THREE.TextureLoader();
    let pending = 0;
    const onLoaded = () => {
      pending--;
      if (pending <= 0) {
        this.pendingRebuild = true;
      }
    };

    for (const terrain of TERRAIN_TYPES) {
      this.terrainTextures[terrain] = null;
      this.cliffTextures[terrain] = null;

      pending++;
      loader.load(
        `/tiles/${terrain}.png`,
        (t) => {
          t.magFilter = THREE.NearestFilter;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.generateMipmaps = true;
          t.colorSpace = THREE.SRGBColorSpace;
          this.terrainTextures[terrain] = t;
          onLoaded();
        },
        undefined,
        onLoaded,
      ); // count errors as loaded to not block

      pending++;
      loader.load(
        `/tiles/${terrain}-cliff.png`,
        (t) => {
          t.magFilter = THREE.NearestFilter;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.generateMipmaps = true;
          t.colorSpace = THREE.SRGBColorSpace;
          this.cliffTextures[terrain] = t;
          onLoaded();
        },
        undefined,
        onLoaded,
      );
    }
  }

  /** Create a material for a terrain type — uses texture if loaded, else color. */
  private makeTerrainMat(terrain: string): THREE.MeshBasicMaterial {
    const tex = this.terrainTextures[terrain];
    if (tex) {
      return new THREE.MeshBasicMaterial({ map: tex });
    }
    return new THREE.MeshBasicMaterial({ color: this.terrainColors[terrain] ?? 0x888888 });
  }

  /** Create a material for a cliff face. */
  private makeCliffMat(terrain: string): THREE.MeshBasicMaterial {
    const tex = this.cliffTextures[terrain];
    if (tex) {
      return new THREE.MeshBasicMaterial({ map: tex });
    }
    return new THREE.MeshBasicMaterial({ color: this.cliffColorMap[terrain] ?? 0x666666 });
  }

  /** Animate water materials across all active chunks. */
  updateWater(_timeMs: number): void {
    // Water animation is subtle enough that static textures look fine for now.
    // TODO: animate water UVs or tint if desired.
  }

  /** Update which chunks are rendered based on player position. */
  updateVisibleChunks(centerCol: number, centerRow: number): void {
    // If textures just finished loading, rebuild all chunks
    if (this.pendingRebuild) {
      this.pendingRebuild = false;
      for (const [, group] of this.activeChunks) {
        this.scene.remove(group);
      }
      this.activeChunks.clear();
      this.fadingChunks.clear();
    }

    const visible = getVisibleChunks(centerCol, centerRow, 4);
    const visibleKeys = new Set(visible.map((c) => chunkKey(c.chunkCol, c.chunkRow)));

    // Fade out chunks no longer visible
    for (const [key, group] of this.activeChunks) {
      if (!visibleKeys.has(key)) {
        this.activeChunks.delete(key);
        const mats = this.collectGroupMaterials(group);
        this.fadingChunks.set(key, { group, opacity: 1, direction: "out", materials: mats });
      }
    }

    // Add newly visible chunks (start transparent, fade in)
    for (const chunk of visible) {
      const key = chunkKey(chunk.chunkCol, chunk.chunkRow);
      if (!this.activeChunks.has(key)) {
        const existing = this.fadingChunks.get(key);
        if (existing) {
          existing.direction = "in";
          this.activeChunks.set(key, existing.group);
          continue;
        }

        const group = this.createChunkGroup(chunk.chunkCol, chunk.chunkRow);
        const mats = this.collectGroupMaterials(group);
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

    for (const tex of Object.values(this.terrainTextures)) {
      tex?.dispose();
    }
    for (const tex of Object.values(this.cliffTextures)) {
      tex?.dispose();
    }
  }

  /** Collect unique per-mesh materials from a chunk group (clones shared mats). */
  private collectGroupMaterials(group: THREE.Group): THREE.MeshBasicMaterial[] {
    const mats: THREE.MeshBasicMaterial[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
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
        const material = this.makeTerrainMat(tile.terrain);
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
          const wallMat = this.makeCliffMat(tile.terrain);
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
