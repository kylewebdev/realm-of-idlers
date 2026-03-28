import GUI from "lil-gui";

/**
 * Debug GUI for live-tweaking rendering parameters.
 * Only visible in development mode.
 */

export interface DebugParams {
  /** Alpha test threshold for sprite materials (0-1). Lower = more edge pixels shown. */
  alphaTest: number;
  /** Scale factor for flat tile planes (1.0 = exact tile, 1.02 = slight overlap). */
  flatTileScale: number;
  /** Elevation scale for static Z positioning. */
  staticElevScale: number;
  /** Elevation scale for terrain heightmap. */
  terrainElevScale: number;
  /** Billboard sprite width multiplier. */
  spriteWidthMul: number;
  /** Billboard sprite height multiplier. */
  spriteHeightMul: number;
  /** Y offset added to all sprites (adjusts height from terrain surface). */
  spriteBaseOffset: number;
  /** Scale for elevated items (walls/roofs) — higher = roofs sit higher above ground. */
  elevatedScale: number;
  /** Camera Y offset. */
  cameraOffsetY: number;
  /** Show wireframe on terrain. */
  terrainWireframe: boolean;
}

const DEFAULT_PARAMS: DebugParams = {
  alphaTest: 0.1,
  flatTileScale: 1.01,
  staticElevScale: 0.06,
  terrainElevScale: 0.06,
  spriteWidthMul: 1.4,
  spriteHeightMul: 1.4,
  spriteBaseOffset: 0.0,
  elevatedScale: 0.15,
  cameraOffsetY: 28,
  terrainWireframe: false,
};

let gui: GUI | null = null;
let params: DebugParams = { ...DEFAULT_PARAMS };
let changeCallbacks: Array<() => void> = [];

export function getDebugParams(): DebugParams {
  return params;
}

export function onDebugParamsChange(cb: () => void): void {
  changeCallbacks.push(cb);
}

function notifyChange(): void {
  for (const cb of changeCallbacks) cb();
}

export function createDebugGui(): DebugParams {
  if (gui) return params;

  gui = new GUI({ title: "Renderer Debug" });
  gui.domElement.style.zIndex = "10000";

  const sprites = gui.addFolder("Sprites");
  sprites.add(params, "alphaTest", 0, 1, 0.01).name("Alpha Test").onChange(notifyChange);
  sprites
    .add(params, "flatTileScale", 0.9, 1.2, 0.005)
    .name("Flat Tile Scale")
    .onChange(notifyChange);
  sprites.add(params, "spriteWidthMul", 0.5, 2.0, 0.05).name("Width Mul").onChange(notifyChange);
  sprites.add(params, "spriteHeightMul", 0.5, 2.0, 0.05).name("Height Mul").onChange(notifyChange);
  sprites
    .add(params, "spriteBaseOffset", -1.0, 1.0, 0.01)
    .name("Base Y Offset")
    .onChange(notifyChange);
  sprites
    .add(params, "elevatedScale", 0.05, 0.4, 0.005)
    .name("Elevated Scale")
    .onChange(notifyChange);

  const elevation = gui.addFolder("Elevation");
  elevation
    .add(params, "staticElevScale", 0, 0.2, 0.005)
    .name("Static Elev Scale")
    .onChange(notifyChange);
  elevation
    .add(params, "terrainElevScale", 0, 0.2, 0.005)
    .name("Terrain Elev Scale")
    .onChange(notifyChange);

  const camera = gui.addFolder("Camera");
  camera.add(params, "cameraOffsetY", 10, 50, 1).name("Camera Y Offset").onChange(notifyChange);

  const debug = gui.addFolder("Debug");
  debug.add(params, "terrainWireframe").name("Terrain Wireframe").onChange(notifyChange);

  return params;
}
