import { CHUNK_SIZE, MAP_SIZE } from "@realm-of-idlers/shared";
import type { ChunkCoord } from "./types.js";

const CHUNKS_PER_AXIS = MAP_SIZE / CHUNK_SIZE; // 8

/** Convert a tile coordinate to its containing chunk. */
export function tileToChunk(col: number, row: number): ChunkCoord {
  return {
    chunkCol: Math.floor(col / CHUNK_SIZE),
    chunkRow: Math.floor(row / CHUNK_SIZE),
  };
}

/** Get the tile range for a chunk. */
export function getChunkTiles(chunkCol: number, chunkRow: number) {
  return {
    startCol: chunkCol * CHUNK_SIZE,
    startRow: chunkRow * CHUNK_SIZE,
    endCol: chunkCol * CHUNK_SIZE + CHUNK_SIZE - 1,
    endRow: chunkRow * CHUNK_SIZE + CHUNK_SIZE - 1,
  };
}

/**
 * Get chunks visible from a center tile position.
 *
 * Returns all chunks within `viewRadius` chunks of the center chunk,
 * clamped to valid chunk bounds.
 */
export function getVisibleChunks(
  centerCol: number,
  centerRow: number,
  viewRadius: number = 2,
): ChunkCoord[] {
  const center = tileToChunk(centerCol, centerRow);
  const chunks: ChunkCoord[] = [];

  const minChunkCol = Math.max(0, center.chunkCol - viewRadius);
  const maxChunkCol = Math.min(CHUNKS_PER_AXIS - 1, center.chunkCol + viewRadius);
  const minChunkRow = Math.max(0, center.chunkRow - viewRadius);
  const maxChunkRow = Math.min(CHUNKS_PER_AXIS - 1, center.chunkRow + viewRadius);

  for (let cr = minChunkRow; cr <= maxChunkRow; cr++) {
    for (let cc = minChunkCol; cc <= maxChunkCol; cc++) {
      chunks.push({ chunkCol: cc, chunkRow: cr });
    }
  }

  return chunks;
}
