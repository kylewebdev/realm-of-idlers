import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createNewGameState } from "../src/factory.js";
import { deleteSave, hasSave, loadGame, saveGame } from "../src/persistence.js";

// Mock localStorage for Node test environment
const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveGame / loadGame round-trip", () => {
  test("preserves all fields", async () => {
    const state = createNewGameState("RoundTrip");
    state.player.gold = 42;
    state.skills.mining.xp = 500;
    state.world.exploredTiles.add("10,20");
    state.world.exploredTiles.add("11,21");

    await saveGame(state);
    const loaded = await loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.player.name).toBe("RoundTrip");
    expect(loaded!.player.gold).toBe(42);
    expect(loaded!.skills.mining.xp).toBe(500);
    expect(loaded!.world.exploredTiles).toBeInstanceOf(Set);
    expect(loaded!.world.exploredTiles.size).toBe(2);
    expect(loaded!.world.exploredTiles.has("10,20")).toBe(true);
  });

  test("Set serialization round-trips correctly", async () => {
    const state = createNewGameState("SetTest");
    state.world.exploredTiles.add("a");
    state.world.exploredTiles.add("b");
    state.world.exploredTiles.add("c");

    await saveGame(state);
    const loaded = await loadGame();

    expect(loaded!.world.exploredTiles).toBeInstanceOf(Set);
    expect([...loaded!.world.exploredTiles].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("hasSave", () => {
  test("returns false when no save exists", () => {
    expect(hasSave()).toBe(false);
  });

  test("returns true after saving", async () => {
    await saveGame(createNewGameState("Test"));
    expect(hasSave()).toBe(true);
  });
});

describe("deleteSave", () => {
  test("removes the save", async () => {
    await saveGame(createNewGameState("Test"));
    expect(hasSave()).toBe(true);
    await deleteSave();
    expect(hasSave()).toBe(false);
  });
});

describe("loadGame", () => {
  test("returns null when no save exists", async () => {
    expect(await loadGame()).toBeNull();
  });
});
