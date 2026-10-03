import type {
  Category,
  CategoryKind,
  Rule,
  SavedTab,
  TabStatus,
  WorkspaceState,
} from "../types";

export const statuses: Record<CategoryKind, TabStatus[]> = {
  general: [""],
  reading: ["", "Unread", "Reading", "Read"],
  jobs: ["", "Review", "Apply", "Applied", "Archived"],
};
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
export function isWebUrl(url: string): boolean {
  try {
    return ["https:", "http:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
export function categoryExists(
  state: WorkspaceState,
  id: string | null,
): boolean {
  return id === null || state.categories.some((c) => c.id === id);
}
export function requireCategory(state: WorkspaceState, id: string | null) {
  if (!categoryExists(state, id))
    throw new Error("That workspace no longer exists. Choose another one.");
}
export function initialState(): WorkspaceState {
  const names = [
    "English",
    "YouTube Playlists",
    "Things to Read",
    "Watching",
    "CV Editing",
    "Tech Study",
    "Projects",
    "Daily",
    "AI",
    "Jobs",
    "Mail",
    "Dev",
    "Other",
  ];
  const categories: Category[] = names.map((name, order) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    icon: "",
    order,
    createdAt: now(),
    kind:
      name === "Jobs"
        ? "jobs"
        : name === "Things to Read"
          ? "reading"
          : "general",
    groupOnOpen: false,
  }));
  const specs: [Rule["matchType"], string, string][] = [
    ["urlContains", "linkedin.com/jobs", "jobs"],
    ["urlContains", "bbc.co.uk/learningenglish", "english"],
    ["urlContains", "bbc.com/learningenglish", "english"],
    ["urlContains", "youtube.com/playlist", "youtube-playlists"],
    ...["chatgpt.com", "claude.ai", "gemini.google.com"].map(
      (d) => ["domain", d, "ai"] as [Rule["matchType"], string, string],
    ),
    ...["kariyer.net", "lever.co", "greenhouse.io"].map(
      (d) => ["domain", d, "jobs"] as [Rule["matchType"], string, string],
    ),
    ...[
      "mail.google.com",
      "outlook.com",
      "outlook.live.com",
      "outlook.office.com",
    ].map((d) => ["domain", d, "mail"] as [Rule["matchType"], string, string]),
    ...["github.com", "localhost", "supabase.com"].map(
      (d) => ["domain", d, "dev"] as [Rule["matchType"], string, string],
    ),
    ["domain", "medium.com", "things-to-read"],
  ];
  return {
    version: 1,
    categories,
    savedTabs: [],
    rules: specs.map(([matchType, matchValue, categoryId]) => ({
      id: uid(),
      matchType,
      matchValue,
      categoryId,
    })),
    settings: { defaultCategoryId: "other" },
  };
}
export function matchesRule(url: string, rule: Rule): boolean {
  if (!isWebUrl(url)) return false;
  const value = rule.matchValue.trim().toLowerCase();
  if (!value) return false;
  if (rule.matchType === "domain") {
    const host = new URL(url).hostname.toLowerCase();
    return host === value || host.endsWith("." + value);
  }
  // Exclude username/password; paths, query strings and hashes remain available.
  const parsed = new URL(url);
  return (parsed.host + parsed.pathname + parsed.search + parsed.hash)
    .toLowerCase()
    .includes(value);
}
export function suggestedCategory(state: WorkspaceState, url: string) {
  return (
    state.rules.find(
      (r) => categoryExists(state, r.categoryId) && matchesRule(url, r),
    )?.categoryId ?? state.settings.defaultCategoryId
  );
}
export function matchesSearch(
  query: string,
  fields: (string | null | undefined)[],
): boolean {
  const haystack = fields.filter(Boolean).join(" ").toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
export function upsertSaved(
  state: WorkspaceState,
  input: {
    title: string;
    url: string;
    favicon: string;
    categoryId: string | null;
    note?: string;
    favorite?: boolean;
  },
): SavedTab {
  requireCategory(state, input.categoryId);
  if (!isWebUrl(input.url))
    throw new Error("Only http and https pages can be saved.");
  if ((input.note?.length ?? 0) > 4000)
    throw new Error("Keep notes under 4,000 characters.");
  const existing = state.savedTabs.find(
    (t) => t.url === input.url && t.categoryId === input.categoryId,
  );
  if (existing) {
    existing.title = input.title;
    existing.favicon = input.favicon;
    if (input.note !== undefined) existing.note = input.note;
    if (input.favorite !== undefined) existing.favorite = input.favorite;
    return existing;
  }
  const kind =
    state.categories.find((c) => c.id === input.categoryId)?.kind ?? "general";
  const record: SavedTab = {
    id: uid(),
    ...input,
    domain: domainOf(input.url),
    note: input.note ?? "",
    favorite: input.favorite ?? false,
    status: kind === "jobs" ? "Review" : kind === "reading" ? "Unread" : "",
    savedAt: now(),
    lastOpenedAt: null,
  };
  state.savedTabs.unshift(record);
  return record;
}
export function deleteCategory(
  state: WorkspaceState,
  id: string,
  disposition: "move" | "uncategorized" | "delete",
  targetId?: string,
) {
  if (!state.categories.some((c) => c.id === id))
    throw new Error("Workspace not found.");
  if (!["move", "uncategorized", "delete"].includes(disposition))
    throw new Error("Choose what to do with saved pages.");
  const destination = disposition === "move" ? (targetId ?? null) : null;
  if (disposition === "move" && (!destination || destination === id))
    throw new Error("Choose a different workspace.");
  requireCategory(state, destination);
  state.savedTabs = state.savedTabs.filter(
    (t) => !(t.categoryId === id && disposition === "delete"),
  );
  for (const tab of state.savedTabs)
    if (tab.categoryId === id) {
      tab.categoryId = destination;
      tab.status = "";
    }
  state.categories = state.categories
    .filter((c) => c.id !== id)
    .map((c, order) => ({ ...c, order }));
  state.rules = state.rules.filter((r) => r.categoryId !== id);
  if (state.settings.defaultCategoryId === id)
    state.settings.defaultCategoryId = destination;
}
