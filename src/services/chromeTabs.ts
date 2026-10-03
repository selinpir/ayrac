import type { OpenTab, WorkspaceState } from "../types";
import {
  categoryExists,
  domainOf,
  isWebUrl,
  suggestedCategory,
} from "../utils/model";
import { readAssignments, writeAssignment } from "./chromeStorage";

export function effectiveUrl(tab: chrome.tabs.Tab): string {
  return tab.pendingUrl || tab.url || "";
}
export async function listOpenTabs(
  state: WorkspaceState,
  windowId: number,
): Promise<OpenTab[]> {
  const [tabs, assignments] = await Promise.all([
    chrome.tabs.query({ windowId }),
    readAssignments(),
  ]);
  return tabs
    .filter(
      (t) =>
        t.id !== undefined &&
        !t.incognito &&
        !effectiveUrl(t).startsWith(chrome.runtime.getURL("")),
    )
    .map((tab) => {
      const url = effectiveUrl(tab);
      const assignment = assignments[String(tab.id)];
      const manual =
        !!assignment &&
        assignment.url === url &&
        categoryExists(state, assignment.categoryId);
      return {
        id: tab.id!,
        windowId: tab.windowId,
        title: tab.title || domainOf(url) || "Untitled tab",
        url,
        domain: domainOf(url),
        favicon: tab.favIconUrl || "",
        active: tab.active,
        pinned: tab.pinned,
        supported: isWebUrl(url),
        categoryId: manual
          ? assignment.categoryId
          : suggestedCategory(state, url),
        manual,
        saved: state.savedTabs.some((t) => t.url === url),
      };
    });
}
export async function checkedTab(
  id: number,
  expectedUrl: string,
): Promise<chrome.tabs.Tab> {
  const tab = await chrome.tabs.get(id);
  if (tab.incognito)
    throw new Error("Private browsing tabs are not supported.");
  if (effectiveUrl(tab) !== expectedUrl)
    throw new Error("This tab changed. Refresh the list and try again.");
  return tab;
}
export async function focusTab(id: number) {
  const tab = await chrome.tabs.update(id, { active: true });
  if (tab) await chrome.windows.update(tab.windowId, { focused: true });
}
export async function openUrl(
  url: string,
  windowId: number,
  categoryId: string | null,
  active: boolean,
) {
  if (!isWebUrl(url)) throw new Error("This saved URL cannot be opened.");
  const tabs = await chrome.tabs.query({ windowId });
  // Exact URLs preserve query strings and anchors; duplicate tabs are not opened.
  const existing = tabs.find((t) => effectiveUrl(t) === url && !t.incognito);
  const tab = existing ?? (await chrome.tabs.create({ url, windowId, active }));
  if (tab.id === undefined) throw new Error("Chrome did not return a tab ID.");
  await writeAssignment(tab.id, { url, categoryId });
  if (active && existing) await focusTab(tab.id);
  return tab;
}
