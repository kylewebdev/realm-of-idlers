import { describe, expect, it } from "vite-plus/test";
import { MAP_SIZE, CHUNK_SIZE } from "@realm-of-idlers/shared";
import { tileToChunk, getChunkTiles, getVisibleChunks } from "../src/chunks.js";

const CHUNKS_PER_AXIS = MAP_SIZE / CHUNK_SIZE; // 8

describe("tileToChunk", () => {
  it("maps tile (0,0) to chunk (0,0)", () => {
    expect(tileToChunk(0, 0)).toEqual({ chunkCol: 0, chunkRow: 0 });
  });

  it("maps tile (7,7) to chunk (0,0)", () => {
    expect(tileToChunk(7, 7)).toEqual({ chunkCol: 0, chunkRow: 0 });
  });

  it("maps tile (8,0) to chunk (1,0)", () => {
    expect(tileToChunk(8, 0)).toEqual({ chunkCol: 1, chunkRow: 0 });
  });

  it("maps tile (63,63) to chunk (7,7)", () => {
    expect(tileToChunk(63, 63)).toEqual({ chunkCol: 7, chunkRow: 7 });
  });

  it("maps center tile to correct chunk", () => {
    expect(tileToChunk(32, 32)).toEqual({ chunkCol: 4, chunkRow: 4 });
  });
});

describe("getChunkTiles", () => {
  it("returns correct range for chunk (0,0)", () => {
    expect(getChunkTiles(0, 0)).toEqual({
      startCol: 0,
      startRow: 0,
      endCol: 7,
      endRow: 7,
    });
  });

  it("returns correct range for chunk (1,2)", () => {
    expect(getChunkTiles(1, 2)).toEqual({
      startCol: 8,
      startRow: 16,
      endCol: 15,
      endRow: 23,
    });
  });

  it("chunk boundaries cover all tiles with no gaps", () => {
    const covered = new Set<string>();
    for (let cr = 0; cr < CHUNKS_PER_AXIS; cr++) {
      for (let cc = 0; cc < CHUNKS_PER_AXIS; cc++) {
        const { startCol, startRow, endCol, endRow } = getChunkTiles(cc, cr);
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const key = `${c},${r}`;
            expect(covered.has(key)).toBe(false); // no overlaps
            covered.add(key);
          }
        }
      }
    }
    expect(covered.size).toBe(MAP_SIZE * MAP_SIZE); // no gaps
  });
});

describe("getVisibleChunks", () => {
  it("returns chunks around center position", () => {
    const chunks = getVisibleChunks(32, 32, 1);
    // Center is chunk (4,4), radius 1 → 3×3 = 9 chunks
    expect(chunks.length).toBe(9);
    expect(chunks).toContainEqual({ chunkCol: 4, chunkRow: 4 });
    expect(chunks).toContainEqual({ chunkCol: 3, chunkRow: 3 });
    expect(chunks).toContainEqual({ chunkCol: 5, chunkRow: 5 });
  });

  it("clamps to valid bounds at corner", () => {
    const chunks = getVisibleChunks(0, 0, 2);
    // Chunk (0,0) with radius 2 → only (0,0) to (2,2) = 3×3 = 9 chunks
    for (const chunk of chunks) {
      expect(chunk.chunkCol).toBeGreaterThanOrEqual(0);
      expect(chunk.chunkRow).toBeGreaterThanOrEqual(0);
      expect(chunk.chunkCol).toBeLessThan(CHUNKS_PER_AXIS);
      expect(chunk.chunkRow).toBeLessThan(CHUNKS_PER_AXIS);
    }
  });

  it("default radius returns reasonable number of chunks", () => {
    const chunks = getVisibleChunks(32, 32);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThanOrEqual(25); // max 5×5
  });
});
