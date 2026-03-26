import { describe, expect, it } from "vite-plus/test";
import {
  TICK_DURATION_MS,
  MAX_OFFLINE_TICKS,
  MAX_SKILL_LEVEL,
  TILE_SIZE,
  CHUNK_SIZE,
  MAP_SIZE,
  INVENTORY_SLOTS,
  BANK_SLOTS,
} from "../src/constants";

describe("constants validity", () => {
  it("TICK_DURATION_MS is positive", () => {
    expect(TICK_DURATION_MS).toBeGreaterThan(0);
  });

  it("MAX_OFFLINE_TICKS is positive", () => {
    expect(MAX_OFFLINE_TICKS).toBeGreaterThan(0);
  });

  it("MAX_SKILL_LEVEL is positive", () => {
    expect(MAX_SKILL_LEVEL).toBeGreaterThan(0);
  });

  it("TILE_SIZE is positive", () => {
    expect(TILE_SIZE).toBeGreaterThan(0);
  });

  it("MAX_OFFLINE_TICKS represents 8 hours", () => {
    const hours = (MAX_OFFLINE_TICKS * TICK_DURATION_MS) / (1000 * 60 * 60);
    expect(hours).toBe(8);
  });

  it("map divides evenly into chunks", () => {
    expect(MAP_SIZE % CHUNK_SIZE).toBe(0);
  });

  it("bank has more slots than inventory", () => {
    expect(BANK_SLOTS).toBeGreaterThan(INVENTORY_SLOTS);
  });
});
