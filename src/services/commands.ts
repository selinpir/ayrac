import type { Assignment, Command, Result, WorkspaceState } from "../types";
import {
  deleteCategory,
  domainOf,
  isWebUrl,
  now,
  requireCategory,
  statuses,
  uid,
  upsertSaved,
} from "../utils/model";
import {
  readState,
  readAssignments,
  reassignDeletedCategory,
  STATE_KEY,
  writeAssignment,
  writeState,
} from "./chromeStorage";
import {
  checkedTab,
  effectiveUrl,
  focusTab,
  listOpenTabs,
  openUrl,
} from "./chromeTabs";
import { groupWorkspace } from "./tabGroups";

function savedById(state: WorkspaceState, id: string) {
  const item = state.savedTabs.find((t) => t.id === id);
  if (!item) throw new Error("This saved page no longer exists.");
  return item;
}
const UNDO_KEY = "ayrac.undo";
interface UndoRecord {
  token: string;
  before: WorkspaceState;
  after: WorkspaceState;
  assignments: Record<string, Assignment>;
  deletedId?: string;
  destination?: string | null;
}
async function saveDeletion(
  before: WorkspaceState,
  after: WorkspaceState,
  deletedId?: string,
  destination: string | null = null,
): Promise<Result> {
  const token = uid();
  const assignments = await readAssignments();
  await chrome.storage.local.set({
    [STATE_KEY]: after,
    [UNDO_KEY]: { token, before, after, assignments, deletedId, destination },
  });
  return {
    notice: deletedId ? "Klasör kaldırıldı." : "Kayıt kaldırıldı.",
    undoToken: token,
  };
}
export async function execute(command: Command): Promise<Result> {
  const state = await readState();
  switch (command.type) {
    case "undo": {
      const record = (await chrome.storage.local.get(UNDO_KEY))[UNDO_KEY] as
        | UndoRecord
        | undefined;
      if (!record || record.token !== command.token)
        throw new Error("Bu işlem artık geri alınamıyor.");
      if (JSON.stringify(state) !== JSON.stringify(record.after))
        throw new Error(
          "Sonrasında kayıtlar değiştiği için geri alma uygulanamadı. Mevcut kayıtların korundu.",
        );
      await chrome.storage.local.set({
        [STATE_KEY]: record.before,
        [UNDO_KEY]: null,
      });
      // Restore only assignments affected by this deletion and not changed afterwards.
      if (record.deletedId) {
        const current = await readAssignments();
        for (const [id, assignment] of Object.entries(record.assignments)) {
          const moved = record.destination ?? null;
          if (
            assignment.categoryId === record.deletedId &&
            current[id]?.url === assignment.url &&
            current[id]?.categoryId === moved
          )
            await writeAssignment(Number(id), assignment);
        }
      }
      return { notice: "İşlem geri alındı." };
    }
    case "saved.deleteMany": {
      const before = structuredClone(state);
      state.savedTabs = state.savedTabs.filter(
        (t) => !command.ids.includes(t.id),
      );
      return saveDeletion(before, state);
    }
    case "saved.openMany": {
      const items = [...new Set(command.ids)].map((id) => savedById(state, id));
      let ready = 0;
      for (const item of items) {
        try {
          await openUrl(item.url, command.windowId, item.categoryId, false);
          item.lastOpenedAt = now();
          ready++;
        } catch {
          /* report partial success */
        }
      }
      await writeState(state);
      return {
        notice: `${ready} bağlantı açıldı.${items.length > ready ? ` ${items.length - ready} bağlantı açılamadı; kayıtları duruyor.` : ""}`,
      };
    }
    case "snapshot":
      return {
        snapshot: { state, tabs: await listOpenTabs(state, command.windowId) },
      };
    case "category.upsert": {
      const name = command.name.trim();
      if (
        command.color !== undefined &&
        !["#0A3323", "#839958", "#F7F4D5", "#D3968C", "#105666"].includes(
          command.color,
        )
      )
        throw new Error("Paletten geçerli bir renk seç.");
      if (!name || name.length > 48)
        throw new Error("Use a workspace name between 1 and 48 characters.");
      if (
        state.categories.some(
          (c) =>
            c.id !== command.id &&
            c.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        throw new Error("A workspace with this name already exists.");
      if (!Object.hasOwn(statuses, command.kind))
        throw new Error("Choose a valid workspace type.");
      if (command.icon.length > 8)
        throw new Error("Use one small icon or emoji.");
      const existing = state.categories.find((c) => c.id === command.id);
      if (command.id && !existing) throw new Error("Workspace not found.");
      if (existing) {
        Object.assign(existing, {
          name,
          icon: command.icon.trim(),
          kind: command.kind,
          groupOnOpen: command.groupOnOpen,
          ...(command.color ? { color: command.color } : {}),
        });
        for (const item of state.savedTabs)
          if (
            item.categoryId === existing.id &&
            !statuses[command.kind].includes(item.status)
          )
            item.status = "";
      } else
        state.categories.push({
          id: uid(),
          name,
          icon: command.icon.trim(),
          kind: command.kind,
          groupOnOpen: command.groupOnOpen,
          ...(command.color ? { color: command.color } : {}),
          order: state.categories.length,
          createdAt: now(),
        });
      break;
    }
    case "category.delete": {
      const before = structuredClone(state);
      deleteCategory(state, command.id, command.disposition, command.targetId);
      const result = await saveDeletion(
        before,
        state,
        command.id,
        command.disposition === "move" ? command.targetId! : null,
      );
      await reassignDeletedCategory(
        command.id,
        command.disposition === "move" ? command.targetId! : null,
      );
      return result;
    }
    case "category.move": {
      const index = state.categories.findIndex((c) => c.id === command.id);
      const to = index + command.direction;
      if (
        index < 0 ||
        to < 0 ||
        to >= state.categories.length ||
        ![-1, 1].includes(command.direction)
      )
        return {};
      [state.categories[index], state.categories[to]] = [
        state.categories[to],
        state.categories[index],
      ];
      state.categories.forEach((c, order) => {
        c.order = order;
      });
      break;
    }
    case "tab.assign":
      requireCategory(state, command.categoryId);
      await checkedTab(command.tabId, command.url);
      await writeAssignment(command.tabId, {
        url: command.url,
        categoryId: command.categoryId,
      });
      return {};
    case "tab.save": {
      const tab = await checkedTab(command.tabId, command.url);
      const url = effectiveUrl(tab);
      const record = upsertSaved(state, {
        title: tab.title || domainOf(url),
        url,
        favicon: tab.favIconUrl || "",
        categoryId: command.categoryId,
        note: command.note,
        favorite: command.favorite,
      });
      // Never close first. A quota/write/readback failure leaves the original tab open.
      await writeState(state);
      const persisted = (await chrome.storage.local.get(STATE_KEY))[
        STATE_KEY
      ] as WorkspaceState | undefined;
      if (
        !persisted?.savedTabs.some(
          (t) => t.id === record.id && t.url === url && t.note === record.note,
        )
      )
        throw new Error("Could not verify this save. The tab was left open.");
      if (command.close) {
        try {
          await checkedTab(command.tabId, url);
        } catch {
          return {
            notice:
              "Page saved. The tab changed or closed, so Ayraç did not close it.",
          };
        }
        try {
          await chrome.tabs.remove(command.tabId);
        } catch {
          return { notice: "Page saved. Chrome could not close the tab." };
        }
      }
      return {
        notice: command.close
          ? "Parked. Find it in Saved."
          : "Saved. The tab is still open.",
      };
    }
    case "tab.close":
      await checkedTab(command.tabId, command.url);
      await chrome.tabs.remove(command.tabId);
      return { notice: "Tab closed without saving." };
    case "tab.focus":
      await focusTab(command.tabId);
      return {};
    case "saved.update": {
      requireCategory(state, command.categoryId);
      if (command.note.length > 4000)
        throw new Error("Keep notes under 4,000 characters.");
      const item = savedById(state, command.id);
      const kind =
        state.categories.find((c) => c.id === command.categoryId)?.kind ??
        "general";
      if (!statuses[kind].includes(command.status))
        throw new Error("Choose a status for this workspace type.");
      Object.assign(item, {
        categoryId: command.categoryId,
        note: command.note,
        status: command.status,
        favorite: command.favorite,
      });
      break;
    }
    case "saved.delete": {
      const before = structuredClone(state);
      state.savedTabs = state.savedTabs.filter((t) => t.id !== command.id);
      return saveDeletion(before, state);
    }
    case "saved.open": {
      const item = savedById(state, command.id);
      await openUrl(item.url, command.windowId, item.categoryId, true);
      item.lastOpenedAt = now();
      break;
    }
    case "workspace.open": {
      requireCategory(state, command.categoryId);
      const items = state.savedTabs.filter(
        (t) => t.categoryId === command.categoryId,
      );
      const tabs: chrome.tabs.Tab[] = [];
      let failed = 0;
      for (const item of items) {
        try {
          tabs.push(
            await openUrl(item.url, command.windowId, item.categoryId, false),
          );
          item.lastOpenedAt = now();
        } catch {
          failed++;
        }
      }
      await writeState(state);
      const category = state.categories.find(
        (c) => c.id === command.categoryId,
      );
      let grouped = true;
      if (category?.groupOnOpen && tabs.length) {
        try {
          await groupWorkspace(category, tabs, command.windowId);
        } catch {
          grouped = false;
        }
      }
      return {
        notice: `${tabs.length} page${tabs.length === 1 ? "" : "s"} ready.${failed ? ` ${failed} could not open. Saved copies are intact.` : ""}${grouped ? "" : " Chrome could not create the group."}`,
      };
    }
    case "rule.add": {
      requireCategory(state, command.categoryId);
      let value = command.matchValue.trim().toLowerCase();
      if (
        !["domain", "urlContains"].includes(command.matchType) ||
        !value ||
        value.length > 500
      )
        throw new Error("Enter a valid rule (up to 500 characters).");
      if (command.matchType === "domain") {
        value = value.replace(/\.$/, "");
        if (
          !/^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/.test(
            value,
          )
        )
          throw new Error("Enter a domain without https, a path or a port.");
      } else if (value.includes("://"))
        throw new Error(
          "Use host/path text, for example linkedin.com/jobs (without https://).",
        );
      if (
        state.rules.some(
          (r) => r.matchType === command.matchType && r.matchValue === value,
        )
      )
        throw new Error(
          "This rule already exists. Remove it first to change its workspace.",
        );
      state.rules.unshift({
        id: uid(),
        matchType: command.matchType,
        matchValue: value,
        categoryId: command.categoryId,
      });
      break;
    }
    case "rule.delete":
      state.rules = state.rules.filter((r) => r.id !== command.id);
      break;
    case "settings.home":
      if (
        command.categoryIds.length > 4 ||
        new Set(command.categoryIds).size !== command.categoryIds.length
      )
        throw new Error(
          "Ana ekranda en fazla 4 farklı klasör gösterebilirsin.",
        );
      command.categoryIds.forEach((id) => requireCategory(state, id));
      state.settings.homeCategoryIds = command.categoryIds;
      break;
    case "settings.update":
      requireCategory(state, command.defaultCategoryId);
      state.settings.defaultCategoryId = command.defaultCategoryId;
      break;
    default:
      throw new Error("Unknown action. Reload Ayraç and try again.");
  }
  await writeState(state);
  return {};
}
