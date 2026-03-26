import type { OfflineSummary } from "@realm-of-idlers/engine";
import { uiStore } from "./store.js";
import { createHudTop } from "./components/hud-top.js";
import { createTabContainer } from "./components/tab-container.js";
import { createActionPanel } from "./components/action-panel.js";
import { createEventLog } from "./components/event-log.js";
import { renderSkillDetail } from "./screens/skill-detail.js";
import { renderWelcomeBack } from "./screens/welcome-back.js";
import { renderQuestJournal } from "./screens/quest-journal.js";
import { renderBankModal } from "./screens/bank-modal.js";
import { renderForgeModal } from "./screens/forge-modal.js";
import { renderCookingModal } from "./screens/cooking-modal.js";
import { renderShopModal } from "./screens/shop-modal.js";

const unsubs: (() => void)[] = [];

/** Initialize all UI components and wire subscriptions. */
export function initUI(): void {
  const hudTop = document.getElementById("hud-top");
  const tabContainer = document.getElementById("panel-tabs");
  const actionPanel = document.getElementById("panel-action");
  const eventLog = document.getElementById("event-log");
  const modalRoot = document.getElementById("modal-root");

  if (hudTop) unsubs.push(createHudTop(hudTop));
  if (tabContainer) unsubs.push(createTabContainer(tabContainer));
  if (actionPanel) unsubs.push(createActionPanel(actionPanel));
  if (eventLog) unsubs.push(createEventLog(eventLog));

  // Modal rendering based on UI store
  if (modalRoot) {
    unsubs.push(
      uiStore.subscribe(() => {
        const { activeModal, selectedSkill } = uiStore.getState();

        if (!activeModal) {
          modalRoot.innerHTML = "";
          modalRoot.classList.remove("visible");
          return;
        }

        modalRoot.classList.add("visible");

        if (activeModal === "skill-detail" && selectedSkill) {
          renderSkillDetail(modalRoot, selectedSkill);
        } else if (activeModal === "quest-journal") {
          renderQuestJournal(modalRoot);
        } else if (activeModal === "bank") {
          renderBankModal(modalRoot);
        } else if (activeModal === "forge") {
          renderForgeModal(modalRoot);
        } else if (activeModal === "cooking") {
          renderCookingModal(modalRoot);
        } else if (activeModal === "shop") {
          renderShopModal(modalRoot);
        }
        // welcome-back is rendered via showWelcomeBack()
      }),
    );
  }

  pushNotification("Game UI initialized.");
}

/** Push a notification to the event log. */
export function pushNotification(msg: string): void {
  uiStore.getState().pushEvent(msg);
}

/** Show the welcome-back modal with offline summary. */
export function showWelcomeBack(summary: OfflineSummary): void {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return;
  modalRoot.classList.add("visible");
  renderWelcomeBack(modalRoot, summary);
}
