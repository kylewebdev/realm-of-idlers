import * as THREE from "three";
import type { TileCoord, GameNotification } from "@realm-of-idlers/shared";
import { TICK_DURATION_MS } from "@realm-of-idlers/shared";
import {
  gameStore,
  loadGame,
  createNewGameState,
  startAutoSave,
  registerExitSave,
} from "@realm-of-idlers/state";
import { GameLoop, simulateOffline } from "@realm-of-idlers/engine";
import type { TickResult, OfflineSummary, TickContext } from "@realm-of-idlers/engine";
import { createTickContext } from "@realm-of-idlers/skills";
import { createCombatProcessor, MONSTERS } from "@realm-of-idlers/combat";
import { ITEMS } from "@realm-of-idlers/items";
import { createBriarwoodMap, findPath } from "@realm-of-idlers/world";
import { QUESTS } from "./quests/registry.js";
import { checkQuestProgress, getAvailableQuests } from "./quests/checker.js";

import { createScene } from "./renderer/scene.js";
import { TileRendererManager } from "./renderer/tile-renderer.js";
import { SpriteRenderer } from "./renderer/sprite-renderer.js";
import { Minimap } from "./renderer/minimap.js";
import { DayNightCycle } from "./renderer/effects.js";
import { SmoothCamera } from "./renderer/camera.js";
import { ParticleSystem } from "./renderer/particles.js";
import { DamageNumbers } from "./renderer/damage-numbers.js";
import { setupMouseInput } from "./input/mouse.js";
import { setupKeyboard } from "./input/keyboard.js";
import { initUI, pushNotification, showWelcomeBack } from "./ui/render.js";
import { uiStore } from "./ui/store.js";

/**
 * Initialize the game: load state, create renderers, wire engine, start loops.
 */
export async function init(): Promise<void> {
  // 1. Load or create game state
  const savedState = await loadGame();
  const state = savedState ?? createNewGameState("Player");
  gameStore.getState().loadState(state);
  console.log("[bridge] State loaded:", savedState ? "from save" : "new game");

  // 2. Create the Briarwood map
  const map = createBriarwoodMap();

  // 3. Setup Three.js scene
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element #game-canvas not found");
  const sceneCtx = createScene(canvas);

  // 4. Create renderers
  const tileRenderer = new TileRendererManager(sceneCtx, map.tiles);
  const spriteRenderer = new SpriteRenderer(sceneCtx.scene);
  spriteRenderer.updateSpawnZones(map.spawnZones);
  spriteRenderer.updateStructures(map.tiles);

  // 5. Create minimap
  const minimapContainer = document.getElementById("minimap");
  let minimap: Minimap | null = null;
  if (minimapContainer) {
    minimap = new Minimap(minimapContainer, map.tiles);
  }

  // 6. Create polish systems
  const dirLight = sceneCtx.scene.children.find(
    (c) => c instanceof DayNightCycle || (c as any).isDirectionalLight,
  ) as THREE.DirectionalLight | undefined;
  const ambientLight = sceneCtx.scene.children.find((c) => (c as any).isAmbientLight) as
    | THREE.AmbientLight
    | undefined;

  let dayNight: DayNightCycle | null = null;
  if (dirLight && ambientLight) {
    dayNight = new DayNightCycle(dirLight, ambientLight, sceneCtx.scene);
  }

  const smoothCamera = new SmoothCamera(sceneCtx.camera);
  const particles = new ParticleSystem(sceneCtx.scene);
  const damageContainer = document.getElementById("ui-overlay");
  const damageNumbers = damageContainer ? new DamageNumbers(damageContainer) : null;

  // 7. Initialize UI
  initUI();

  // 7b. Auto-activate "Welcome to Briarwood" quest for new games
  if (!savedState && !gameStore.getState().quests["welcome"]) {
    gameStore.getState().setQuestStatus("welcome", "active");
    pushNotification("Quest started: Welcome to Briarwood");
  }

  // 8. Initial render position
  const playerPos = gameStore.getState().player.position;
  tileRenderer.update(playerPos.col, playerPos.row);
  spriteRenderer.setPlayerPosition(playerPos.col, playerPos.row);
  minimap?.updatePlayerPosition(playerPos.col, playerPos.row);
  smoothCamera.setTarget(playerPos.col, playerPos.row);
  smoothCamera.snap();

  // 9. Build TickContext with activities + combat
  const ctx: TickContext = createTickContext();
  ctx.processCombatTick = createCombatProcessor(MONSTERS, ITEMS);

  // 10. Tick callback — update renderers on each game tick
  const onTick = (result: TickResult, notifications: GameNotification[]) => {
    const store = gameStore.getState();
    const pos = store.player.position;

    // Update renderers
    tileRenderer.update(pos.col, pos.row);
    spriteRenderer.setPlayerPosition(pos.col, pos.row);
    minimap?.updatePlayerPosition(pos.col, pos.row);
    minimap?.updateExploredTiles(store.world.exploredTiles);
    smoothCamera.setTarget(pos.col, pos.row);

    // Push notifications to UI event log
    for (const n of notifications) {
      pushNotification(n.message);
    }

    // Spawn particles for gather completions
    if (result.itemsGained.length > 0) {
      const action = store.actionQueue[0];
      if (action?.type === "gather") {
        const actId = action.activityId;
        const pType = actId.includes("chop") ? "wood" : actId.includes("mine") ? "ore" : "fish";
        particles.spawnGatherParticle(pos.col, pos.row, pType);
      }
    }

    // Spawn level-up particles
    for (const n of notifications) {
      if (n.type === "level_up") {
        particles.spawnLevelUpParticle(pos.col, pos.row);
      }
    }

    // Spawn damage numbers for combat events
    for (const evt of result.combatEvents) {
      if (evt.type === "hit" && evt.damage) {
        const color = evt.source === "player" ? "#ffffff" : "#ff4444";
        const label = evt.source === "player" ? `${evt.damage}` : `-${evt.damage}`;
        damageNumbers?.spawnAtCenter(label, color, evt.source === "player" ? 30 : -30);
      } else if (evt.type === "miss") {
        const color = evt.source === "player" ? "#999999" : "#666666";
        damageNumbers?.spawnAtCenter("Miss", color, evt.source === "player" ? 30 : -30);
      }
    }

    // Track monster kills for quest objectives
    for (const evt of result.combatEvents) {
      if (evt.type === "death" && evt.source === "monster") {
        const action = store.actionQueue[0];
        if (action?.type === "combat") {
          gameStore.getState().incrementKillCount(action.monsterId);
        }
      }
    }

    // Track craft completions for quest objectives
    for (const item of result.itemsGained) {
      const currentState = gameStore.getState();
      for (const [questId, quest] of Object.entries(QUESTS)) {
        if (currentState.quests[questId] !== "active") continue;
        for (const obj of quest.objectives) {
          if (obj.type === "craft" && obj.itemId === item.itemId) {
            const prev = currentState.questProgress[questId]?.[obj.objectiveId] ?? 0;
            gameStore
              .getState()
              .updateQuestProgress(questId, obj.objectiveId, prev + item.quantity);
          }
        }
      }
    }

    // Check quest progress
    const questUpdates = checkQuestProgress(gameStore.getState(), QUESTS);
    for (const update of questUpdates) {
      if (update.completed) {
        const quest = QUESTS[update.questId];
        if (quest) {
          pushNotification(`Quest ready to claim: ${quest.name}`);
        }
      }
    }

    // Auto-unlock available quests
    const available = getAvailableQuests(gameStore.getState(), QUESTS);
    for (const quest of available) {
      gameStore.getState().setQuestStatus(quest.id, "available");
      pushNotification(`New quest available: ${quest.name}`);
    }
  };

  const onCatchUp = (summary: OfflineSummary) => {
    pushNotification(`Offline: ${summary.ticksProcessed} ticks processed`);
    showWelcomeBack(summary);
  };

  // 11. Create and start the game loop
  const gameLoop = new GameLoop(
    () => gameStore.getState(),
    (s) => gameStore.getState().loadState(s),
    ctx,
    { onTick, onCatchUp },
  );

  // 12. Check for offline time and simulate catch-up
  const lastTick = gameStore.getState().timestamps.lastTick;
  if (lastTick > 0) {
    const elapsed = Date.now() - lastTick;
    const missedTicks = Math.floor(elapsed / TICK_DURATION_MS);
    if (missedTicks > 1) {
      console.log(`[bridge] Simulating ${missedTicks} offline ticks...`);
      const { newState, summary } = simulateOffline(gameStore.getState(), missedTicks, ctx);
      gameStore.getState().loadState(newState);
      onCatchUp(summary);
    }
  }

  // 13. Wire persistence
  startAutoSave(() => gameStore.getState());
  registerExitSave(() => gameStore.getState());

  // 14. Setup input — location-based activities
  let movementPath: TileCoord[] = [];
  let movementIndex = 0;
  let pendingActivity: {
    activityId: string;
    nodeId: string;
    targetTile: TileCoord;
    tickDuration: number;
  } | null = null;

  /** Set a pending activity and pathfind to the target tile. */
  function walkToAndStartActivity(
    activityId: string,
    nodeId: string,
    targetTile: TileCoord,
    tickDuration: number,
  ): void {
    const from = gameStore.getState().player.position;
    const path = findPath(map.tiles, from, targetTile);
    if (path && path.length > 1) {
      pendingActivity = { activityId, nodeId, targetTile, tickDuration };
      movementPath = path;
      movementIndex = 1;
      gameStore.getState().setAction({ type: "idle" }); // stop current action while walking
      pushNotification(`Walking to ${activityId}...`);
    } else if (path && path.length === 1) {
      // Already at the node
      startActivityAtNode(activityId, nodeId, tickDuration);
    } else {
      pushNotification("Can't reach that location.");
    }
  }

  /** Start an activity (player already at node). */
  function startActivityAtNode(activityId: string, nodeId: string, tickDuration: number): void {
    pushNotification(`Started: ${activityId}`);
    gameStore.getState().setAction({
      type: "gather",
      activityId,
      nodeId,
      ticksRemaining: tickDuration,
    });
  }

  // Expose walkToAndStartActivity for the skill-detail modal
  (window as any).__walkToActivity = walkToAndStartActivity;
  (window as any).__briarwoodMap = map;

  setupMouseInput(
    canvas,
    sceneCtx,
    map.tiles,
    () => gameStore.getState().player.position,
    (path) => {
      pendingActivity = null; // cancel pending if clicking elsewhere
      movementPath = path;
      movementIndex = 1;
    },
    (tile, coord) => {
      if (tile.resourceNode) {
        // Walk to the resource node, then start gathering
        const def = ctx.activities.gather[tile.resourceNode.activityId];
        walkToAndStartActivity(
          tile.resourceNode.activityId,
          tile.resourceNode.nodeId,
          coord,
          def?.baseTickDuration ?? 7,
        );
        return; // don't also pathfind via onMoveTo
      }
      if (tile.structure) {
        pushNotification(`Interacting with ${tile.structure}`);
        const currentState = gameStore.getState();
        for (const [questId, quest] of Object.entries(QUESTS)) {
          if (currentState.quests[questId] !== "active") continue;
          for (const obj of quest.objectives) {
            if (obj.type === "talk") {
              gameStore.getState().updateQuestProgress(questId, obj.objectiveId, 1);
              pushNotification(`Talked to ${obj.npcId}!`);
            }
          }
        }
      }
    },
  );

  setupKeyboard((panel) => {
    if (panel === "inventory" || panel === "skills" || panel === "action") {
      uiStore.getState().togglePanel(panel);
    } else if (panel === "quests") {
      uiStore.getState().openModal("quest-journal");
    }
  });

  // 15. Start game loop
  gameLoop.start();

  // 16. Render loop with polish systems
  let lastTime = performance.now();

  const renderLoop = () => {
    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;

    // Update polish systems
    dayNight?.update(delta);
    smoothCamera.update();
    particles.update(delta);
    tileRenderer.updateWater(now);

    // Process movement along path
    if (movementPath.length > 0 && movementIndex < movementPath.length) {
      const nextTile = movementPath[movementIndex]!;
      gameStore.getState().updatePlayer({ position: nextTile });
      gameStore.getState().addExploredTile(`${nextTile.col},${nextTile.row}`);

      spriteRenderer.setPlayerPosition(nextTile.col, nextTile.row);
      tileRenderer.update(nextTile.col, nextTile.row);
      minimap?.updatePlayerPosition(nextTile.col, nextTile.row);
      smoothCamera.setTarget(nextTile.col, nextTile.row);

      movementIndex++;
      if (movementIndex >= movementPath.length) {
        movementPath = [];
        movementIndex = 0;

        // Check if we arrived at a pending activity target
        if (pendingActivity) {
          const pos = gameStore.getState().player.position;
          const dx = Math.abs(pos.col - pendingActivity.targetTile.col);
          const dz = Math.abs(pos.row - pendingActivity.targetTile.row);
          if (dx <= 1 && dz <= 1) {
            startActivityAtNode(
              pendingActivity.activityId,
              pendingActivity.nodeId,
              pendingActivity.tickDuration,
            );
          }
          pendingActivity = null;
        }
      }
    }

    sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);
    requestAnimationFrame(renderLoop);
  };

  requestAnimationFrame(renderLoop);

  console.log("[bridge] Game initialized successfully");
}
