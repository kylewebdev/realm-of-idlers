import * as THREE from "three";
import type { TileCoord, GameNotification } from "@realm-of-idlers/shared";
import { TICK_DURATION_MS, tileToWorld } from "@realm-of-idlers/shared";
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
import { createBriarwoodMap } from "@realm-of-idlers/world";

import { createScene } from "./renderer/scene.js";
import { TileRendererManager } from "./renderer/tile-renderer.js";
import { SpriteRenderer } from "./renderer/sprite-renderer.js";
import { Minimap } from "./renderer/minimap.js";
import { setupMouseInput } from "./input/mouse.js";
import { setupKeyboard } from "./input/keyboard.js";

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

  // 6. Initial render position
  const playerPos = gameStore.getState().player.position;
  tileRenderer.update(playerPos.col, playerPos.row);
  spriteRenderer.setPlayerPosition(playerPos.col, playerPos.row);
  minimap?.updatePlayerPosition(playerPos.col, playerPos.row);
  centerCamera(sceneCtx, playerPos);

  // 7. Build TickContext with activities + combat
  const ctx: TickContext = createTickContext();
  ctx.processCombatTick = createCombatProcessor(MONSTERS, ITEMS);

  // 8. Tick callback — update renderers on each game tick
  const onTick = (_result: TickResult, notifications: GameNotification[]) => {
    const currentState = gameStore.getState();
    const pos = currentState.player.position;

    // Update renderers
    tileRenderer.update(pos.col, pos.row);
    spriteRenderer.setPlayerPosition(pos.col, pos.row);
    minimap?.updatePlayerPosition(pos.col, pos.row);
    minimap?.updateExploredTiles(currentState.world.exploredTiles);
    centerCamera(sceneCtx, pos);

    // Log notifications to console (UI panels in Step 9)
    for (const n of notifications) {
      console.log(`[${n.type}] ${n.message}`);
    }
  };

  const onCatchUp = (summary: OfflineSummary) => {
    console.log(
      `[bridge] Offline catch-up: ${summary.ticksProcessed} ticks,`,
      `XP: ${JSON.stringify(summary.xpGained)},`,
      `Items: ${summary.itemsGained.length}`,
    );
  };

  // 9. Create and start the game loop
  const gameLoop = new GameLoop(
    () => gameStore.getState(),
    (s) => gameStore.getState().loadState(s),
    ctx,
    { onTick, onCatchUp },
  );

  // 10. Check for offline time and simulate catch-up
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

  // 11. Wire persistence
  startAutoSave(() => gameStore.getState());
  registerExitSave(() => gameStore.getState());

  // 12. Setup input
  let movementPath: TileCoord[] = [];
  let movementIndex = 0;

  setupMouseInput(
    canvas,
    sceneCtx,
    map.tiles,
    () => gameStore.getState().player.position,
    (path) => {
      movementPath = path;
      movementIndex = 1; // skip starting tile
    },
    (tile, _coord) => {
      if (tile.resourceNode) {
        console.log(`[input] Starting activity: ${tile.resourceNode.activityId}`);
        gameStore.getState().setAction({
          type: "gather",
          activityId: tile.resourceNode.activityId,
          nodeId: tile.resourceNode.nodeId,
          ticksRemaining: 7,
        });
      }
    },
  );

  setupKeyboard((panel) => {
    console.log(`[input] Toggle panel: ${panel}`);
    // Panel toggling implemented in Step 9
  });

  // 13. Start game loop
  gameLoop.start();

  // 14. Render loop (separate from tick loop)
  const renderLoop = () => {
    // Process movement along path (one tile per frame at ~10fps feel)
    if (movementPath.length > 0 && movementIndex < movementPath.length) {
      const nextTile = movementPath[movementIndex]!;
      gameStore.getState().updatePlayer({ position: nextTile });
      gameStore.getState().addExploredTile(`${nextTile.col},${nextTile.row}`);

      const pos = nextTile;
      spriteRenderer.setPlayerPosition(pos.col, pos.row);
      tileRenderer.update(pos.col, pos.row);
      minimap?.updatePlayerPosition(pos.col, pos.row);
      centerCamera(sceneCtx, pos);

      movementIndex++;
      if (movementIndex >= movementPath.length) {
        movementPath = [];
        movementIndex = 0;
      }
    }

    sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);
    requestAnimationFrame(renderLoop);
  };

  requestAnimationFrame(renderLoop);

  console.log("[bridge] Game initialized successfully");
}

/** Center the camera on a tile position. */
function centerCamera(sceneCtx: { camera: THREE.OrthographicCamera }, pos: TileCoord): void {
  const worldPos = tileToWorld(pos.col, pos.row, 0);
  sceneCtx.camera.position.set(worldPos.x + 30, 40, worldPos.z + 30);
  sceneCtx.camera.lookAt(worldPos.x, 0, worldPos.z);
}
