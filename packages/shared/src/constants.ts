/** Milliseconds between game ticks */
export const TICK_DURATION_MS = 600;

/** Maximum ticks simulated when returning from offline (8 hours) */
export const MAX_OFFLINE_TICKS = 48_000;

/** Maximum achievable skill level */
export const MAX_SKILL_LEVEL = 99;

/** Pixel size of a single tile in the texture atlas */
export const TILE_SIZE = 64;

/** Tiles per chunk side (chunks are CHUNK_SIZE x CHUNK_SIZE) */
export const CHUNK_SIZE = 8;

/** Total map dimensions for Briarwood in tiles */
export const MAP_SIZE = 64;

/** Inventory slot count */
export const INVENTORY_SLOTS = 28;

/** Bank slot count */
export const BANK_SLOTS = 100;

/** Base delay between tile movements in ms (stamina level 1) */
export const BASE_MOVE_DELAY_MS = 200;

/** Minimum delay between tile movements in ms (stamina level 99) */
export const MIN_MOVE_DELAY_MS = 80;

/** Auto-save interval in milliseconds */
export const AUTO_SAVE_INTERVAL_MS = 30_000;

/** localStorage key for save data */
export const SAVE_KEY = "realm-of-idlers-save";
