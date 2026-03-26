import { createStore } from "zustand/vanilla";
import type {
  GameMap,
  GroundCell,
  MapObject,
  EdgeWall,
  MapSpawnZone,
  ObjectTypeId,
  WallTypeId,
  WallEdge,
} from "@realm-of-idlers/world";
import type { TerrainType } from "@realm-of-idlers/shared";

export type EditorTool =
  | "terrain"
  | "elevation"
  | "object"
  | "wall"
  | "eraser"
  | "spawn"
  | "select";

export interface UndoEntry {
  description: string;
  undo: () => void;
  redo: () => void;
}

export interface EditorState {
  // Map data
  map: GameMap | null;
  dirty: boolean;

  // Tool state
  activeTool: EditorTool;
  selectedTerrain: TerrainType;
  selectedObjectType: ObjectTypeId;
  selectedWallType: WallTypeId;
  brushSize: number;

  // View state
  camera: { x: number; y: number; zoom: number };
  showGrid: boolean;
  showObjects: boolean;
  showWalls: boolean;
  showSpawnZones: boolean;

  // Selection
  selectedObject: MapObject | null;

  // Undo/redo
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
}

export interface EditorActions {
  // Map management
  loadMap: (map: GameMap) => void;
  newMap: (width: number, height: number, name: string) => void;

  // Ground editing
  setTerrain: (col: number, row: number, terrain: TerrainType) => void;
  setElevation: (col: number, row: number, delta: number) => void;

  // Object editing
  placeObject: (obj: MapObject) => void;
  removeObject: (col: number, row: number) => void;

  // Wall editing
  placeWall: (col: number, row: number, edge: WallEdge, wallTypeId: WallTypeId) => void;
  removeWall: (col: number, row: number, edge: WallEdge) => void;

  // Spawn zones
  addSpawnZone: (zone: MapSpawnZone) => void;
  removeSpawnZone: (index: number) => void;

  // Tool state
  setTool: (tool: EditorTool) => void;
  setSelectedTerrain: (terrain: TerrainType) => void;
  setSelectedObjectType: (typeId: ObjectTypeId) => void;
  setSelectedWallType: (typeId: WallTypeId) => void;
  setBrushSize: (size: number) => void;

  // View
  setCamera: (camera: Partial<EditorState["camera"]>) => void;
  toggleGrid: () => void;
  toggleObjects: () => void;
  toggleWalls: () => void;
  toggleSpawnZones: () => void;

  // Selection
  selectObject: (obj: MapObject | null) => void;

  // Undo/redo
  pushUndo: (entry: UndoEntry) => void;
  undo: () => void;
  redo: () => void;
}

export type EditorStore = EditorState & EditorActions;

function createEmptyMap(width: number, height: number, name: string): GameMap {
  const ground: GroundCell[][] = [];
  for (let row = 0; row < height; row++) {
    const rowData: GroundCell[] = [];
    for (let col = 0; col < width; col++) {
      rowData.push({ terrain: "grass", elevation: 0 });
    }
    ground.push(rowData);
  }
  return {
    meta: { name, version: 1, width, height },
    ground,
    objects: [],
    walls: [],
    spawnZones: [],
  };
}

export const editorStore = createStore<EditorStore>((set, get) => ({
  map: null,
  dirty: false,
  activeTool: "terrain",
  selectedTerrain: "grass",
  selectedObjectType: "normal-tree",
  selectedWallType: "stone-wall",
  brushSize: 1,
  camera: { x: 0, y: 0, zoom: 1 },
  showGrid: true,
  showObjects: true,
  showWalls: true,
  showSpawnZones: true,
  selectedObject: null,
  undoStack: [],
  redoStack: [],

  loadMap: (map) => set({ map, dirty: false, undoStack: [], redoStack: [] }),

  newMap: (width, height, name) =>
    set({ map: createEmptyMap(width, height, name), dirty: false, undoStack: [], redoStack: [] }),

  setTerrain: (col, row, terrain) => {
    const { map } = get();
    if (!map || row < 0 || row >= map.meta.height || col < 0 || col >= map.meta.width) return;
    const prev = map.ground[row]![col]!.terrain;
    if (prev === terrain) return;
    map.ground[row]![col]!.terrain = terrain;
    set({ dirty: true });
    get().pushUndo({
      description: `Set terrain at ${col},${row} to ${terrain}`,
      undo: () => {
        map.ground[row]![col]!.terrain = prev;
        set({ dirty: true });
      },
      redo: () => {
        map.ground[row]![col]!.terrain = terrain;
        set({ dirty: true });
      },
    });
  },

  setElevation: (col, row, delta) => {
    const { map } = get();
    if (!map || row < 0 || row >= map.meta.height || col < 0 || col >= map.meta.width) return;
    const cell = map.ground[row]![col]!;
    const prev = cell.elevation;
    const next = Math.max(0, Math.min(3, prev + delta)) as 0 | 1 | 2 | 3;
    if (prev === next) return;
    cell.elevation = next;
    set({ dirty: true });
    get().pushUndo({
      description: `Set elevation at ${col},${row} to ${next}`,
      undo: () => {
        cell.elevation = prev;
        set({ dirty: true });
      },
      redo: () => {
        cell.elevation = next;
        set({ dirty: true });
      },
    });
  },

  placeObject: (obj) => {
    const { map } = get();
    if (!map) return;
    // Remove existing object at same position
    const existing = map.objects.findIndex((o) => o.col === obj.col && o.row === obj.row);
    const removed = existing >= 0 ? map.objects.splice(existing, 1)[0]! : null;
    map.objects.push(obj);
    set({ dirty: true });
    get().pushUndo({
      description: `Place ${obj.typeId} at ${obj.col},${obj.row}`,
      undo: () => {
        const idx = map.objects.indexOf(obj);
        if (idx >= 0) map.objects.splice(idx, 1);
        if (removed) map.objects.push(removed);
        set({ dirty: true });
      },
      redo: () => {
        if (removed) {
          const ri = map.objects.indexOf(removed);
          if (ri >= 0) map.objects.splice(ri, 1);
        }
        map.objects.push(obj);
        set({ dirty: true });
      },
    });
  },

  removeObject: (col, row) => {
    const { map } = get();
    if (!map) return;
    const idx = map.objects.findIndex((o) => o.col === col && o.row === row);
    if (idx < 0) return;
    const removed = map.objects.splice(idx, 1)[0]!;
    set({ dirty: true });
    get().pushUndo({
      description: `Remove ${removed.typeId} at ${col},${row}`,
      undo: () => {
        map.objects.push(removed);
        set({ dirty: true });
      },
      redo: () => {
        const ri = map.objects.findIndex((o) => o.col === col && o.row === row);
        if (ri >= 0) map.objects.splice(ri, 1);
        set({ dirty: true });
      },
    });
  },

  placeWall: (col, row, edge, wallTypeId) => {
    const { map } = get();
    if (!map) return;
    const existing = map.walls.findIndex((w) => w.col === col && w.row === row && w.edge === edge);
    if (existing >= 0) return; // already exists
    const wall: EdgeWall = { col, row, edge, wallTypeId };
    map.walls.push(wall);
    set({ dirty: true });
    get().pushUndo({
      description: `Place ${wallTypeId} wall at ${col},${row} ${edge}`,
      undo: () => {
        const wi = map.walls.indexOf(wall);
        if (wi >= 0) map.walls.splice(wi, 1);
        set({ dirty: true });
      },
      redo: () => {
        map.walls.push(wall);
        set({ dirty: true });
      },
    });
  },

  removeWall: (col, row, edge) => {
    const { map } = get();
    if (!map) return;
    const idx = map.walls.findIndex((w) => w.col === col && w.row === row && w.edge === edge);
    if (idx < 0) return;
    const removed = map.walls.splice(idx, 1)[0]!;
    set({ dirty: true });
    get().pushUndo({
      description: `Remove wall at ${col},${row} ${edge}`,
      undo: () => {
        map.walls.push(removed);
        set({ dirty: true });
      },
      redo: () => {
        const ri = map.walls.findIndex((w) => w.col === col && w.row === row && w.edge === edge);
        if (ri >= 0) map.walls.splice(ri, 1);
        set({ dirty: true });
      },
    });
  },

  addSpawnZone: (zone) => {
    const { map } = get();
    if (!map) return;
    map.spawnZones.push(zone);
    set({ dirty: true });
  },

  removeSpawnZone: (index) => {
    const { map } = get();
    if (!map || index < 0 || index >= map.spawnZones.length) return;
    map.spawnZones.splice(index, 1);
    set({ dirty: true });
  },

  setTool: (tool) => set({ activeTool: tool }),
  setSelectedTerrain: (terrain) => set({ selectedTerrain: terrain }),
  setSelectedObjectType: (typeId) => set({ selectedObjectType: typeId }),
  setSelectedWallType: (typeId) => set({ selectedWallType: typeId }),
  setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(5, size)) }),

  setCamera: (partial) => set((s) => ({ camera: { ...s.camera, ...partial } })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleObjects: () => set((s) => ({ showObjects: !s.showObjects })),
  toggleWalls: () => set((s) => ({ showWalls: !s.showWalls })),
  toggleSpawnZones: () => set((s) => ({ showSpawnZones: !s.showSpawnZones })),

  selectObject: (obj) => set({ selectedObject: obj }),

  pushUndo: (entry) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), entry],
      redoStack: [],
    })),

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1]!;
    entry.undo();
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    }));
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1]!;
    entry.redo();
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, entry],
    }));
  },
}));
