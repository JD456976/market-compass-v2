export const SCENARIO_EXPLORER_OPEN_EVENT = "mc:scenario-explorer:open";

export function openScenarioExplorer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SCENARIO_EXPLORER_OPEN_EVENT));
}
