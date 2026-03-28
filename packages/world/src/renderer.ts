import * as THREE from "three";
import { ELEV_SCALE } from "@realm-of-idlers/shared";
import type { GameMap, GameMapV2 } from "./types.js";
import { getChunkTiles, getVisibleChunks } from "./chunks.js";
import { getGround, getGroundV2, getElevationAt } from "./map-loader.js";
import { getLandTile, TileFlag, hasFlag } from "./tile-data.js";

/** Fallback colors if textures aren't loaded yet. */
const TERRAIN_COLORS: Record<string, number> = {
  grass: 0x4a7c3f,
  dirt: 0x8b7355,
  stone: 0x888888,
  water: 0x3a6ea5,
  sand: 0xc2b280,
  forest: 0x2d5a1e,
  jungle: 0x1a5c2a,
  snow: 0xe8e8e8,
  cave: 0x4a4a4a,
  brick: 0x8b4513,
  sandstone: 0xd2a679,
  wood: 0x8b6914,
  tile: 0xa0856c,
  farmland: 0x6b4226,
  lava: 0xcc3300,
  cobblestones: 0x5a5550,
  marble: 0xc0b8b0,
  flagstone: 0x908070,
};

/** Seconds for chunks to fade in/out. */
const CHUNK_FADE_DURATION = 0.35;

/** Vertices per tile (2 triangles × 3 vertices). */
const VERTS_PER_TILE = 6;

interface FadingChunk {
  group: THREE.Group;
  opacity: number;
  direction: "in" | "out";
  materials: THREE.Material[];
}

/**
 * Renders visible tile chunks as heightmap meshes.
 * Each chunk is a single BufferGeometry with per-vertex elevation
 * from UO-style stretched land corner sampling.
 */
export class ChunkRenderer {
  private activeChunks = new Map<string, THREE.Group>();
  private fadingChunks = new Map<string, FadingChunk>();
  /** Textures keyed by texId (UO texmap) or sprite name (V1 fallback). */
  private terrainTextures = new Map<string, THREE.Texture | null>();
  /** Material cache keyed by texId or sprite name. */
  private terrainMaterials = new Map<string, THREE.MeshLambertMaterial>();
  private pendingRebuild = false;
  private isV2: boolean;

  constructor(
    private scene: THREE.Scene,
    private gameMap: GameMap | GameMapV2,
  ) {
    this.isV2 = gameMap.meta.version === 2;

    const loader = new THREE.TextureLoader();
    const texKeys = this.getUniqueTextureKeys();
    let pending = texKeys.length;
    let loaded = 0;
    let failed = 0;

    console.log(`[ChunkRenderer] Loading ${pending} terrain textures`);

    if (pending === 0) {
      console.warn("[ChunkRenderer] No terrain textures found — using fallback colors");
      this.pendingRebuild = true;
    }

    const applyTexSettings = (t: THREE.Texture) => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.colorSpace = THREE.SRGBColorSpace;
    };

    const onLoaded = () => {
      pending--;
      if (pending <= 0) {
        console.log(`[ChunkRenderer] All textures processed: ${loaded} loaded, ${failed} failed`);
        this.pendingRebuild = true;
      }
    };

    for (const { key, path } of texKeys) {
      this.terrainTextures.set(key, null);
      loader.load(
        path,
        (t) => {
          applyTexSettings(t);
          this.terrainTextures.set(key, t);
          this.terrainMaterials.delete(key);
          loaded++;
          onLoaded();
        },
        undefined,
        () => {
          failed++;
          onLoaded();
        },
      );
    }
  }

  /** Collect unique texture keys and paths from the map. */
  private getUniqueTextureKeys(): { key: string; path: string }[] {
    if (this.isV2) {
      const v2 = this.gameMap as GameMapV2;
      const seen = new Set<string>();
      const keys: { key: string; path: string }[] = [];
      for (const row of v2.ground) {
        for (const cell of row) {
          // Prefer texId (UO texmap), fall back to tileId sprite name
          if (cell.texId && cell.texId > 0) {
            const k = `t${cell.texId}`;
            if (!seen.has(k)) {
              seen.add(k);
              keys.push({ key: k, path: `/tiles/texmap/${cell.texId}.png` });
            }
          } else {
            const landTile = getLandTile(cell.tileId);
            const sprite = landTile?.sprite ?? "grass";
            if (!seen.has(sprite)) {
              seen.add(sprite);
              keys.push({ key: sprite, path: `/tiles/${sprite}.png` });
            }
          }
        }
      }
      return keys;
    }
    // V1 fallback
    const names = ["grass", "dirt", "stone", "water"];
    return names.map((n) => ({ key: n, path: `/tiles/${n}.png` }));
  }

  /** Get or create a LambertMaterial for a texture key. */
  private getTerrainMaterial(texKey: string, fallbackColor: number): THREE.MeshLambertMaterial {
    const cached = this.terrainMaterials.get(texKey);
    if (cached) return cached;

    const tex = this.terrainTextures.get(texKey);
    const mat = tex
      ? new THREE.MeshLambertMaterial({ map: tex })
      : new THREE.MeshLambertMaterial({ color: fallbackColor });
    this.terrainMaterials.set(texKey, mat);
    return mat;
  }

  /** Get terrain info for a cell. */
  private getCellInfo(
    col: number,
    row: number,
  ): { texKey: string; fallbackColor: number; elevation: number; isWater: boolean } | null {
    if (this.isV2) {
      const cell = getGroundV2(this.gameMap as GameMapV2, col, row);
      if (!cell) return null;
      const landTile = getLandTile(cell.tileId);
      // Use texId key if available, otherwise sprite name
      const texKey =
        cell.texId && cell.texId > 0 ? `t${cell.texId}` : (landTile?.sprite ?? "grass");
      return {
        texKey,
        fallbackColor: landTile?.fallbackColor ?? 0x888888,
        elevation: cell.elevation ?? 0,
        isWater: landTile ? hasFlag(landTile.flags, TileFlag.Wet) : false,
      };
    }
    const cell = getGround(this.gameMap as GameMap, col, row);
    if (!cell) return null;
    return {
      texKey: cell.terrain,
      fallbackColor: TERRAIN_COLORS[cell.terrain] ?? 0x888888,
      elevation: cell.elevation,
      isWater: cell.terrain === "water",
    };
  }

  /** Animate water materials across all active chunks. */
  updateWater(_timeMs: number): void {
    // Water animation placeholder
  }

  /** True when textures finished loading and chunks need rebuilding. */
  get needsRebuild(): boolean {
    return this.pendingRebuild;
  }

  /** Get all active terrain meshes for raycasting. */
  getTerrainMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const [, group] of this.activeChunks) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
    }
    return meshes;
  }

  /** Update which chunks are rendered based on player position. */
  updateVisibleChunks(centerCol: number, centerRow: number): void {
    if (this.pendingRebuild) {
      this.pendingRebuild = false;
      let textured = 0;
      for (const t of this.terrainTextures.values()) if (t !== null) textured++;
      console.log(
        `[ChunkRenderer] Rebuilding chunks — ${textured}/${this.terrainTextures.size} textures available`,
      );
      this.terrainMaterials.clear();
      for (const [, group] of this.activeChunks) {
        this.scene.remove(group);
      }
      this.activeChunks.clear();
      this.fadingChunks.clear();
    }

    const mapSize = Math.max(this.gameMap.meta.width, this.gameMap.meta.height);
    const visible = getVisibleChunks(centerCol, centerRow, 4, mapSize);
    const visibleKeys = new Set(visible.map((c) => chunkKey(c.chunkCol, c.chunkRow)));

    for (const [key, group] of this.activeChunks) {
      if (!visibleKeys.has(key)) {
        this.activeChunks.delete(key);
        const mats = this.collectMaterials(group);
        this.fadingChunks.set(key, { group, opacity: 1, direction: "out", materials: mats });
      }
    }

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
        const mats = this.collectMaterials(group);
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

      if (fade.direction === "in" && fade.opacity >= 1) {
        this.fadingChunks.delete(key);
      }

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
    for (const mat of this.terrainMaterials.values()) {
      mat.dispose();
    }
    this.terrainMaterials.clear();
  }

  /** Collect all materials from a chunk group for fade animation. */
  private collectMaterials(group: THREE.Group): THREE.Material[] {
    const mats: THREE.Material[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshMats = Array.isArray(child.material) ? child.material : [child.material];
        for (const src of meshMats) {
          // Clone so fading one chunk doesn't affect shared materials
          const clone = src.clone();
          mats.push(clone);
        }
        child.material = mats.length === 1 ? mats[0]! : [...mats];
      }
    });
    return mats;
  }

  /**
   * Build a heightmap mesh for one 8×8 chunk.
   * Uses non-indexed geometry so each tile quad has independent UVs.
   * Tiles are sorted by sprite and grouped into material ranges.
   */
  private createChunkGroup(chunkCol: number, chunkRow: number): THREE.Group {
    const group = new THREE.Group();
    const { startCol, startRow, endCol, endRow } = getChunkTiles(chunkCol, chunkRow);
    const v2 = this.isV2 ? (this.gameMap as GameMapV2) : null;

    // Collect tile info
    interface TileEntry {
      col: number;
      row: number;
      texKey: string;
      fallbackColor: number;
      elevation: number;
      isWater: boolean;
    }

    const tiles: TileEntry[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const info = this.getCellInfo(col, row);
        if (!info) continue;
        tiles.push({ col, row, ...info });
      }
    }

    if (tiles.length === 0) return group;

    // Sort by texKey for material grouping
    tiles.sort((a, b) => a.texKey.localeCompare(b.texKey));

    // Build vertex buffers
    const vertCount = tiles.length * VERTS_PER_TILE;
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);

    // Track material groups
    const groups: { start: number; count: number; materialIndex: number }[] = [];
    const materials: THREE.MeshLambertMaterial[] = [];
    let currentSprite = "";
    let groupStartVert = 0;

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]!;
      const vi = i * VERTS_PER_TILE; // vertex index

      // Material group tracking — new group when texKey changes
      if (tile.texKey !== currentSprite) {
        if (currentSprite !== "") {
          groups.push({
            start: groupStartVert,
            count: vi - groupStartVert,
            materialIndex: materials.length - 1,
          });
        }
        currentSprite = tile.texKey;
        groupStartVert = vi;
        materials.push(this.getTerrainMaterial(tile.texKey, tile.fallbackColor));
      }

      // Corner elevations — stretched land for V2, flat for water/V1
      let tlY: number, trY: number, blY: number, brY: number;
      if (v2 && !tile.isWater) {
        tlY = getElevationAt(v2, tile.col, tile.row) * ELEV_SCALE;
        trY = getElevationAt(v2, tile.col + 1, tile.row) * ELEV_SCALE;
        blY = getElevationAt(v2, tile.col, tile.row + 1) * ELEV_SCALE;
        brY = getElevationAt(v2, tile.col + 1, tile.row + 1) * ELEV_SCALE;
      } else {
        const y = tile.elevation * ELEV_SCALE;
        tlY = trY = blY = brY = y;
      }

      // Positions — two triangles per tile (counter-clockwise from above for upward normals)
      const pi = vi * 3;
      // Triangle 1: TL, BL, TR
      positions[pi] = tile.col;
      positions[pi + 1] = tlY;
      positions[pi + 2] = tile.row;
      positions[pi + 3] = tile.col;
      positions[pi + 4] = blY;
      positions[pi + 5] = tile.row + 1;
      positions[pi + 6] = tile.col + 1;
      positions[pi + 7] = trY;
      positions[pi + 8] = tile.row;
      // Triangle 2: TR, BL, BR
      positions[pi + 9] = tile.col + 1;
      positions[pi + 10] = trY;
      positions[pi + 11] = tile.row;
      positions[pi + 12] = tile.col;
      positions[pi + 13] = blY;
      positions[pi + 14] = tile.row + 1;
      positions[pi + 15] = tile.col + 1;
      positions[pi + 16] = brY;
      positions[pi + 17] = tile.row + 1;

      // UVs — each tile maps to full texture (matching vertex order)
      const ui = vi * 2;
      // Triangle 1: TL(0,1), BL(0,0), TR(1,1)
      uvs[ui] = 0;
      uvs[ui + 1] = 1;
      uvs[ui + 2] = 0;
      uvs[ui + 3] = 0;
      uvs[ui + 4] = 1;
      uvs[ui + 5] = 1;
      // Triangle 2: TR(1,1), BL(0,0), BR(1,0)
      uvs[ui + 6] = 1;
      uvs[ui + 7] = 1;
      uvs[ui + 8] = 0;
      uvs[ui + 9] = 0;
      uvs[ui + 10] = 1;
      uvs[ui + 11] = 0;
    }

    // Close last material group
    if (tiles.length > 0) {
      groups.push({
        start: groupStartVert,
        count: tiles.length * VERTS_PER_TILE - groupStartVert,
        materialIndex: materials.length - 1,
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    for (const g of groups) {
      geometry.addGroup(g.start, g.count, g.materialIndex);
    }

    const mesh = new THREE.Mesh(geometry, materials);
    group.add(mesh);

    return group;
  }
}

function chunkKey(chunkCol: number, chunkRow: number): string {
  return `${chunkCol},${chunkRow}`;
}
