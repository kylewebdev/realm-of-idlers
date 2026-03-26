import { describe, expect, test } from "vite-plus/test";
import { createGameStore } from "../src/store.js";

function makeStore() {
  return createGameStore("TestPlayer");
}

describe("store initialization", () => {
  test("creates with default game state", () => {
    const store = makeStore();
    const state = store.getState();
    expect(state.player.name).toBe("TestPlayer");
    expect(state.skills.woodcutting.level).toBe(1);
  });
});

describe("addXp", () => {
  test("adds XP to a skill", () => {
    const store = makeStore();
    store.getState().addXp("woodcutting", 50);
    expect(store.getState().skills.woodcutting.xp).toBe(50);
  });

  test("auto-levels when XP threshold crossed", () => {
    const store = makeStore();
    store.getState().addXp("woodcutting", 83);
    expect(store.getState().skills.woodcutting.level).toBe(2);
  });

  test("levels up multiple times", () => {
    const store = makeStore();
    store.getState().addXp("woodcutting", 200);
    // 200 XP → level 3 (needs 174)
    expect(store.getState().skills.woodcutting.level).toBe(3);
  });
});

describe("setAction", () => {
  test("sets the action queue", () => {
    const store = makeStore();
    store
      .getState()
      .setAction({ type: "gather", activityId: "chop_tree", nodeId: "tree1", ticksRemaining: 7 });
    expect(store.getState().actionQueue[0]).toEqual({
      type: "gather",
      activityId: "chop_tree",
      nodeId: "tree1",
      ticksRemaining: 7,
    });
  });
});

describe("updatePlayer", () => {
  test("partially updates player fields", () => {
    const store = makeStore();
    store.getState().updatePlayer({ gold: 100 });
    expect(store.getState().player.gold).toBe(100);
    expect(store.getState().player.name).toBe("TestPlayer");
  });
});

describe("addExploredTile", () => {
  test("adds tile to explored set", () => {
    const store = makeStore();
    store.getState().addExploredTile("5,10");
    expect(store.getState().world.exploredTiles.has("5,10")).toBe(true);
  });
});

describe("updateResourceNode", () => {
  test("sets resource node state", () => {
    const store = makeStore();
    store.getState().updateResourceNode("node1", { depleted: true, respawnAt: 1000 });
    expect(store.getState().world.resourceNodes.node1).toEqual({
      depleted: true,
      respawnAt: 1000,
    });
  });
});

describe("setQuestStatus", () => {
  test("sets quest status", () => {
    const store = makeStore();
    store.getState().setQuestStatus("quest_welcome", "active");
    expect(store.getState().quests.quest_welcome).toBe("active");
  });
});

describe("loadState", () => {
  test("replaces entire state", () => {
    const store = makeStore();
    store.getState().addXp("woodcutting", 500);

    const freshState = store.getState();
    const store2 = createGameStore("Other");
    store2.getState().loadState(freshState);

    expect(store2.getState().player.name).toBe("TestPlayer");
    expect(store2.getState().skills.woodcutting.xp).toBe(500);
  });
});
