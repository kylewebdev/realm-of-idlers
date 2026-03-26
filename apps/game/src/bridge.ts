import * as THREE from "three";
import type { TileCoord, GameNotification } from "@realm-of-idlers/shared";
import { TICK_DURATION_MS, BASE_MOVE_DELAY_MS, MIN_MOVE_DELAY_MS } from "@realm-of-idlers/shared";
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
import { loadMap, indexMap, findPathToAdjacent } from "@realm-of-idlers/world";
import type { MapObject } from "@realm-of-idlers/world";
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
 * Initialize the game: load state, load map, create renderers, wire engine, start loops.
 */
export async function init(): Promise<void> {
  // 1. Load or create game state
  const savedState = await loadGame();
  const state = savedState ?? createNewGameState("Player");
  gameStore.getState().loadState(state);
  console.log("[bridge] State loaded:", savedState ? "from save" : "new game");

  // 2. Load the map from JSON
  const gameMap = await loadMap("/maps/briarwood.json");
  const mapIndex = indexMap(gameMap);
  console.log(
    `[bridge] Map loaded: ${gameMap.meta.name} (${gameMap.meta.width}x${gameMap.meta.height})`,
  );

  // 3. Setup Three.js scene
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element #game-canvas not found");
  const sceneCtx = createScene(canvas);

  // 4. Create renderers
  const tileRenderer = new TileRendererManager(sceneCtx, gameMap);
  const spriteRenderer = new SpriteRenderer(sceneCtx.scene, gameMap);
  spriteRenderer.setCamera(sceneCtx.camera);
  spriteRenderer.updateSpawnZones(gameMap.spawnZones);
  spriteRenderer.updateEntities();

  // 5. Create minimap
  const minimapContainer = document.getElementById("minimap");
  let minimap: Minimap | null = null;
  if (minimapContainer) {
    minimap = new Minimap(minimapContainer, gameMap);
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
  spriteRenderer.snapPlayerPosition();
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

    tileRenderer.update(pos.col, pos.row);
    spriteRenderer.setPlayerPosition(pos.col, pos.row);
    minimap?.updatePlayerPosition(pos.col, pos.row);
    minimap?.updateExploredTiles(store.world.exploredTiles);
    smoothCamera.setTarget(pos.col, pos.row);

    for (const n of notifications) {
      pushNotification(n.message);
    }

    if (result.itemsGained.length > 0) {
      const action = store.actionQueue[0];
      if (action?.type === "gather") {
        const actId = action.activityId;
        const pType = actId.includes("chop") ? "wood" : actId.includes("mine") ? "ore" : "fish";
        particles.spawnGatherParticle(pos.col, pos.row, pType);
      }
    }

    for (const n of notifications) {
      if (n.type === "level_up") {
        particles.spawnLevelUpParticle(pos.col, pos.row);
      }
    }

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

    for (const evt of result.combatEvents) {
      if (evt.type === "death" && evt.source === "monster") {
        const action = store.actionQueue[0];
        if (action?.type === "combat") {
          gameStore.getState().incrementKillCount(action.monsterId);
        }
      }
    }

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

    const questUpdates = checkQuestProgress(gameStore.getState(), QUESTS);
    for (const update of questUpdates) {
      if (update.completed) {
        const quest = QUESTS[update.questId];
        if (quest) pushNotification(`Quest ready to claim: ${quest.name}`);
      }
    }

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
  let movementTimer = 0;
  let tilesMoved = 0;

  function getMoveDelay(): number {
    const staminaLevel = gameStore.getState().skills.stamina?.level ?? 1;
    const t = (staminaLevel - 1) / 98;
    return BASE_MOVE_DELAY_MS - t * (BASE_MOVE_DELAY_MS - MIN_MOVE_DELAY_MS);
  }

  let pendingActivity: {
    activityId: string;
    nodeId: string;
    targetTile: TileCoord;
    tickDuration: number;
  } | null = null;

  let pendingStructure: {
    structureType: string;
    targetTile: TileCoord;
  } | null = null;

  const STRUCTURE_MODALS: Record<string, string> = {
    bank: "bank",
    forge: "forge",
    "cooking-range": "cooking",
    shop: "shop",
  };

  function walkToAndOpenStructure(structureType: string, targetTile: TileCoord): void {
    const from = gameStore.getState().player.position;
    const path = findPathToAdjacent(mapIndex, from, targetTile);
    if (path && path.length > 1) {
      pendingStructure = { structureType, targetTile };
      pendingActivity = null;
      movementPath = path;
      movementIndex = 1;
      movementTimer = 0;
      gameStore.getState().setAction({ type: "idle" });
    } else if (path && path.length <= 1) {
      const modalId = STRUCTURE_MODALS[structureType];
      if (modalId) uiStore.getState().openModal(modalId);
    } else {
      pushNotification("Can't reach that location.");
    }
  }

  function walkToAndStartActivity(
    activityId: string,
    nodeId: string,
    targetTile: TileCoord,
    tickDuration: number,
  ): void {
    const from = gameStore.getState().player.position;
    const path = findPathToAdjacent(mapIndex, from, targetTile);
    if (path && path.length > 1) {
      pendingActivity = { activityId, nodeId, targetTile, tickDuration };
      movementPath = path;
      movementIndex = 1;
      movementTimer = 0;
      gameStore.getState().setAction({ type: "idle" });
      pushNotification(`Walking to ${activityId}...`);
    } else if (path && path.length <= 1) {
      startActivityAtNode(activityId, nodeId, tickDuration);
    } else {
      pushNotification("Can't reach that location.");
    }
  }

  function startActivityAtNode(activityId: string, nodeId: string, tickDuration: number): void {
    pushNotification(`Started: ${activityId}`);
    gameStore.getState().setAction({
      type: "gather",
      activityId,
      nodeId,
      ticksRemaining: tickDuration,
    });
  }

  // Expose for skill-detail modal
  (window as any).__walkToActivity = walkToAndStartActivity;
  (window as any).__gameMap = gameMap;

  setupMouseInput(
    canvas,
    sceneCtx,
    mapIndex,
    spriteRenderer,
    () => gameStore.getState().player.position,
    (path) => {
      pendingActivity = null;
      pendingStructure = null;
      movementPath = path;
      movementIndex = 1;
      movementTimer = 0;
      const action = gameStore.getState().actionQueue[0];
      if (action && action.type !== "idle") {
        gameStore.getState().setAction({ type: "idle" });
        pushNotification("Stopped activity — moving away.");
      }
    },
    (obj: MapObject, coord: TileCoord) => {
      if (obj.interaction?.kind === "resource") {
        const def = ctx.activities.gather[obj.interaction.activityId];
        walkToAndStartActivity(
          obj.interaction.activityId,
          obj.interaction.nodeId,
          coord,
          def?.baseTickDuration ?? 7,
        );
      } else if (obj.interaction?.kind === "structure") {
        walkToAndOpenStructure(obj.interaction.structureType, coord);
        // Quest talk objectives
        const currentState = gameStore.getState();
        for (const [questId, quest] of Object.entries(QUESTS)) {
          if (currentState.quests[questId] !== "active") continue;
          for (const qObj of quest.objectives) {
            if (qObj.type === "talk") {
              gameStore.getState().updateQuestProgress(questId, qObj.objectiveId, 1);
              pushNotification(`Talked to ${qObj.npcId}!`);
            }
          }
        }
      }
    },
    (_coord: TileCoord) => {
      // Ground click — no special handling beyond pathfinding (handled by mouse.ts)
    },
  );

  setupKeyboard((panel) => {
    if (panel === "quests") {
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

    dayNight?.update(delta);
    smoothCamera.update();
    particles.update(delta);
    spriteRenderer.update(delta);
    tileRenderer.updateWater(now);
    tileRenderer.updateFade(delta);

    if (movementPath.length > 0 && movementIndex < movementPath.length) {
      movementTimer += delta;
      const moveDelay = getMoveDelay();
      spriteRenderer.setMoveDelay(moveDelay);

      while (movementTimer >= moveDelay && movementIndex < movementPath.length) {
        movementTimer -= moveDelay;

        const nextTile = movementPath[movementIndex]!;
        gameStore.getState().updatePlayer({ position: nextTile });
        gameStore.getState().addExploredTile(`${nextTile.col},${nextTile.row}`);

        spriteRenderer.setPlayerPosition(nextTile.col, nextTile.row);
        tileRenderer.update(nextTile.col, nextTile.row);
        minimap?.updatePlayerPosition(nextTile.col, nextTile.row);
        smoothCamera.setTarget(nextTile.col, nextTile.row);

        movementIndex++;
        tilesMoved++;

        if (tilesMoved % 5 === 0) {
          gameStore.getState().addXp("stamina", 4);
        }

        if (movementIndex >= movementPath.length) {
          movementPath = [];
          movementIndex = 0;
          movementTimer = 0;

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

          if (pendingStructure) {
            const pos = gameStore.getState().player.position;
            const dx = Math.abs(pos.col - pendingStructure.targetTile.col);
            const dz = Math.abs(pos.row - pendingStructure.targetTile.row);
            if (dx <= 1 && dz <= 1) {
              const modalId = STRUCTURE_MODALS[pendingStructure.structureType];
              if (modalId) uiStore.getState().openModal(modalId);
            }
            pendingStructure = null;
          }
        }
      }
    }

    sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);
    requestAnimationFrame(renderLoop);
  };

  requestAnimationFrame(renderLoop);

  console.log("[bridge] Game initialized successfully");
}
