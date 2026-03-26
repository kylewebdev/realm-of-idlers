import { uiStore } from "../store.js";
import type { TabId } from "../store.js";
import { createInventoryPanel } from "./inventory-panel.js";
import { createSkillPanel } from "./skill-panel.js";
import { createEquipmentPanel } from "./equipment-panel.js";

const TABS: { id: TabId; label: string; key: string }[] = [
  { id: "inventory", label: "Inventory", key: "I" },
  { id: "skills", label: "Skills", key: "S" },
  { id: "equipment", label: "Equipment", key: "E" },
];

export function createTabContainer(container: HTMLElement): () => void {
  container.innerHTML = `
    <div class="tab-bar"></div>
    <div class="tab-content"></div>
  `;

  const tabBar = container.querySelector(".tab-bar")!;
  const tabContent = container.querySelector(".tab-content")!;

  // Build tab buttons
  for (const tab of TABS) {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.dataset.tab = tab.id;
    btn.textContent = `${tab.label} (${tab.key})`;
    btn.addEventListener("click", () => uiStore.getState().setTab(tab.id));
    tabBar.appendChild(btn);
  }

  // Track active panel unsub
  let activeUnsub: (() => void) | null = null;
  let activeTabId: TabId | null = null;

  function renderTab() {
    const { activeTab } = uiStore.getState();
    if (activeTab === activeTabId) return;
    activeTabId = activeTab;

    // Clean up previous panel
    if (activeUnsub) {
      activeUnsub();
      activeUnsub = null;
    }
    tabContent.innerHTML = "";

    // Update active button
    for (const btn of tabBar.querySelectorAll(".tab-btn")) {
      (btn as HTMLElement).classList.toggle(
        "active",
        (btn as HTMLElement).dataset.tab === activeTab,
      );
    }

    // Mount the selected panel
    const panelEl = document.createElement("div");
    panelEl.className = "tab-panel";
    tabContent.appendChild(panelEl);

    switch (activeTab) {
      case "inventory":
        activeUnsub = createInventoryPanel(panelEl);
        break;
      case "skills":
        activeUnsub = createSkillPanel(panelEl);
        break;
      case "equipment":
        activeUnsub = createEquipmentPanel(panelEl);
        break;
    }
  }

  renderTab();
  const unsub = uiStore.subscribe(renderTab);

  return () => {
    unsub();
    if (activeUnsub) activeUnsub();
  };
}
