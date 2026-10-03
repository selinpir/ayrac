import type { Category } from "../types";
// Session-only IDs avoid incorrectly reusing Chrome group IDs after a restart.
export async function groupWorkspace(
  category: Category,
  tabs: chrome.tabs.Tab[],
  windowId: number,
) {
  const ids = tabs
    .filter((t) => t.id !== undefined && !t.pinned)
    .map((t) => t.id!) as [number, ...number[]];
  if (!ids.length) return;
  const key = `group:${windowId}:${category.id}`;
  const stored = (await chrome.storage.session.get(key))[key] as
    | number
    | undefined;
  let groupId: number | undefined;
  if (stored !== undefined) {
    try {
      const group = await chrome.tabGroups.get(stored);
      if (group.windowId === windowId) groupId = group.id;
    } catch {
      /* A user may have removed the old group. */
    }
  }
  const result = await chrome.tabs.group(
    groupId === undefined
      ? { tabIds: ids, createProperties: { windowId } }
      : { tabIds: ids, groupId },
  );
  await chrome.tabGroups.update(result, {
    title: category.name,
    color: "grey",
    collapsed: false,
  });
  await chrome.storage.session.set({ [key]: result });
}
