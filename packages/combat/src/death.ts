import type { GameNotification, GameState, TileCoord } from "@realm-of-idlers/shared";

const TOWN_CENTER: TileCoord = { col: 32, row: 32 };
const DEATH_GOLD_PENALTY = 0.1;

export interface DeathResult {
  goldPenalty: number;
  respawnPosition: TileCoord;
  notifications: GameNotification[];
}

/**
 * Handle player death: deduct 10% gold, respawn at town center.
 * No item loss.
 */
export function handleDeath(state: GameState): DeathResult {
  const goldPenalty = Math.floor(state.player.gold * DEATH_GOLD_PENALTY);

  return {
    goldPenalty,
    respawnPosition: TOWN_CENTER,
    notifications: [
      {
        type: "death",
        message: `You have died! Lost ${goldPenalty} gold.`,
      },
    ],
  };
}
