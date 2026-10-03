import type { Assignment, WorkspaceState } from "../types";
import { initialState } from "../utils/model";

export const STATE_KEY = "tabshelf.v1";
const SESSION_KEY = "tabshelf.assignments";
export async function readState(): Promise<WorkspaceState> {
  const raw = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] as
    | Partial<WorkspaceState>
    | null
    | undefined;
  if (raw === undefined) {
    const state = initialState();
    await writeState(state);
    return state;
  }
  if (
    !raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.categories) ||
    !Array.isArray(raw.savedTabs) ||
    !Array.isArray(raw.rules) ||
    !raw.settings
  ) {
    throw new Error(
      "Saved data could not be read. It has not been changed. Reload the extension or restore a backup.",
    );
  }
  return raw as WorkspaceState;
}
export async function writeState(state: WorkspaceState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}
export async function readAssignments(): Promise<Record<string, Assignment>> {
  return (
    ((await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY] as Record<
      string,
      Assignment
    >) ?? {}
  );
}
export async function writeAssignment(tabId: number, assignment?: Assignment) {
  const all = await readAssignments();
  if (assignment) all[String(tabId)] = assignment;
  else delete all[String(tabId)];
  await chrome.storage.session.set({ [SESSION_KEY]: all });
}
export async function reassignDeletedCategory(
  id: string,
  destination: string | null,
) {
  const all = await readAssignments();
  for (const item of Object.values(all))
    if (item.categoryId === id) item.categoryId = destination;
  await chrome.storage.session.set({ [SESSION_KEY]: all });
}
