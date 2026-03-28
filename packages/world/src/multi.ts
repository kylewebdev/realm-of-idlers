import type { TileFlags } from "./tile-data.js";
import { TileFlag } from "./tile-data.js";
import type { MapStatic } from "./types.js";

export interface MultiComponent {
  staticId: string;
  offsetCol: number;
  offsetRow: number;
  offsetZ: number;
  flags?: TileFlags;
}

export interface MultiDef {
  multiId: string;
  name: string;
  components: MultiComponent[];
  foundationWidth: number;
  foundationHeight: number;
}

export const MULTI_DEFS: Record<string, MultiDef> = {
  "small-house": {
    multiId: "small-house",
    name: "Small House",
    foundationWidth: 3,
    foundationHeight: 3,
    components: [
      // Walls around the perimeter
      { staticId: "stone-wall", offsetCol: 0, offsetRow: 0, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 1, offsetRow: 0, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 2, offsetRow: 0, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 0, offsetRow: 1, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 2, offsetRow: 1, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 0, offsetRow: 2, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 2, offsetRow: 2, offsetZ: 0 },
      // Door on south wall center
      { staticId: "stone-wall", offsetCol: 1, offsetRow: 2, offsetZ: 0, flags: TileFlag.Door },
    ],
  },
  watchtower: {
    multiId: "watchtower",
    name: "Watchtower",
    foundationWidth: 2,
    foundationHeight: 2,
    components: [
      { staticId: "stone-wall", offsetCol: 0, offsetRow: 0, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 1, offsetRow: 0, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 0, offsetRow: 1, offsetZ: 0 },
      { staticId: "stone-wall", offsetCol: 1, offsetRow: 1, offsetZ: 0 },
    ],
  },
};

/** Expand a multi definition into world-space MapStatic entries. */
export function expandMulti(multiId: string, col: number, row: number, z: number = 0): MapStatic[] {
  const def = MULTI_DEFS[multiId];
  if (!def) return [];

  return def.components.map((comp) => ({
    col: col + comp.offsetCol,
    row: row + comp.offsetRow,
    z: z + comp.offsetZ,
    staticId: comp.staticId,
    flags: comp.flags ?? TileFlag.Impassable | TileFlag.Wall,
  }));
}
