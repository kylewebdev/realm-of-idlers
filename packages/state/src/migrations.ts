import { CURRENT_SAVE_VERSION } from "./factory.js";

type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of migrations keyed by the version they migrate FROM.
 * To add a migration: increment CURRENT_SAVE_VERSION in factory.ts,
 * then add an entry here: `migrations[oldVersion] = (state) => newState`.
 */
const migrations: Record<number, MigrationFn> = {
  // v1 → v2: Add stamina skill
  1: (state) => {
    const skills = state.skills as Record<string, { level: number; xp: number }>;
    if (!skills.stamina) {
      skills.stamina = { level: 1, xp: 0 };
    }
    return { ...state, skills, version: 2 };
  },
};

/**
 * Applies chained migrations from `state.version` up to CURRENT_SAVE_VERSION.
 * Returns the migrated state, or the original if already current.
 */
export function migrate(state: Record<string, unknown>): Record<string, unknown> {
  let current = state;
  let version = current.version as number;

  while (version < CURRENT_SAVE_VERSION) {
    const fn = migrations[version];
    if (!fn) {
      throw new Error(`No migration found for version ${version} → ${version + 1}`);
    }
    current = fn(current);
    version = current.version as number;
  }

  return current;
}
