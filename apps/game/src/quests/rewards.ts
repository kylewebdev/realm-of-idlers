import { gameStore } from "@realm-of-idlers/state";
import { addItem } from "@realm-of-idlers/items";
import { getItem } from "@realm-of-idlers/items";
import type { QuestReward } from "./types.js";
import { pushNotification } from "../ui/render.js";

/**
 * Apply quest rewards to the game state.
 */
export function applyQuestRewards(rewards: QuestReward[]): void {
  const store = gameStore.getState();

  for (const reward of rewards) {
    switch (reward.type) {
      case "gold":
        store.updatePlayer({ gold: store.player.gold + reward.amount });
        pushNotification(`Received ${reward.amount} gold!`);
        break;

      case "xp":
        store.addXp(reward.skill, reward.amount);
        pushNotification(`Received ${reward.amount} ${reward.skill} XP!`);
        break;

      case "item": {
        const itemDef = getItem(reward.itemId);
        if (itemDef) {
          const result = addItem(store.inventory, reward.itemId, reward.qty, itemDef);
          if (result.ok) {
            store.loadState({ ...store, inventory: result.inventory });
            pushNotification(`Received ${itemDef.name} x${reward.qty}!`);
          }
        }
        break;
      }
    }
  }
}
