export type CategoryKind = "general" | "reading" | "jobs";
export type TabStatus =
  | ""
  | "Unread"
  | "Reading"
  | "Read"
  | "Review"
  | "Apply"
  | "Applied"
  | "Archived";
export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  order: number;
  createdAt: string;
  kind: CategoryKind;
  groupOnOpen: boolean;
}
export interface SavedTab {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon: string;
  categoryId: string | null;
  note: string;
  status: TabStatus;
  favorite: boolean;
  savedAt: string;
  lastOpenedAt: string | null;
}
export interface Rule {
  id: string;
  matchType: "domain" | "urlContains";
  matchValue: string;
  categoryId: string;
}
export interface WorkspaceState {
  version: 1;
  categories: Category[];
  savedTabs: SavedTab[];
  rules: Rule[];
  settings: { defaultCategoryId: string | null; homeCategoryIds?: string[] };
}
export interface Assignment {
  url: string;
  categoryId: string | null;
}
export interface OpenTab {
  id: number;
  windowId: number;
  title: string;
  url: string;
  domain: string;
  favicon: string;
  pinned: boolean;
  active: boolean;
  supported: boolean;
  categoryId: string | null;
  manual: boolean;
  saved: boolean;
}
export type Command =
  | { type: "snapshot"; windowId: number }
  | {
      type: "category.upsert";
      id?: string;
      name: string;
      icon: string;
      color?: string;
      kind: CategoryKind;
      groupOnOpen: boolean;
    }
  | {
      type: "category.delete";
      id: string;
      disposition: "move" | "uncategorized" | "delete";
      targetId?: string;
    }
  | { type: "category.move"; id: string; direction: -1 | 1 }
  | {
      type: "tab.assign";
      tabId: number;
      url: string;
      categoryId: string | null;
    }
  | {
      type: "tab.save";
      tabId: number;
      url: string;
      categoryId: string | null;
      note?: string;
      close: boolean;
      favorite?: boolean;
    }
  | { type: "tab.close"; tabId: number; url: string }
  | { type: "tab.focus"; tabId: number }
  | {
      type: "saved.update";
      id: string;
      categoryId: string | null;
      note: string;
      status: TabStatus;
      favorite: boolean;
    }
  | { type: "saved.delete"; id: string }
  | { type: "saved.deleteMany"; ids: string[] }
  | { type: "saved.openMany"; ids: string[]; windowId: number }
  | { type: "undo"; token: string }
  | { type: "saved.open"; id: string; windowId: number }
  | { type: "workspace.open"; categoryId: string | null; windowId: number }
  | {
      type: "rule.add";
      matchType: Rule["matchType"];
      matchValue: string;
      categoryId: string;
    }
  | { type: "rule.delete"; id: string }
  | { type: "settings.update"; defaultCategoryId: string | null }
  | { type: "settings.home"; categoryIds: string[] };
export interface Snapshot {
  state: WorkspaceState;
  tabs: OpenTab[];
}
export interface Result {
  snapshot?: Snapshot;
  notice?: string;
  undoToken?: string;
}
export type Response =
  | { ok: true; result: Result }
  | { ok: false; error: string };
