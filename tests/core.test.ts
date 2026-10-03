import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  deleteCategory,
  initialState,
  isWebUrl,
  matchesRule,
  matchesSearch,
  suggestedCategory,
  upsertSaved,
} from "../src/utils/model";
import { execute } from "../src/services/commands";
import { STATE_KEY } from "../src/services/chromeStorage";
import type { WorkspaceState } from "../src/types";

let local: Record<string, unknown>;
let session: Record<string, unknown>;
let closed: number[];
let writesFail: boolean;
let corruptReadback: boolean;
let navAfterWrite: boolean;
let getCalls: number;
const url = "https://example.com/lesson#unit-4";
beforeEach(() => {
  local = { [STATE_KEY]: initialState() };
  session = {};
  closed = [];
  writesFail = false;
  corruptReadback = false;
  navAfterWrite = false;
  getCalls = 0;
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: {
          async get(key: string) {
            getCalls++;
            return structuredClone({
              [key]: corruptReadback && getCalls > 1 ? undefined : local[key],
            });
          },
          async set(value: Record<string, unknown>) {
            if (writesFail) throw new Error("QUOTA_BYTES exceeded");
            Object.assign(local, structuredClone(value));
          },
        },
        session: {
          async get(key: string) {
            return structuredClone({ [key]: session[key] });
          },
          async set(value: Record<string, unknown>) {
            Object.assign(session, structuredClone(value));
          },
        },
      },
      tabs: {
        async get(id: number) {
          return {
            id,
            url:
              navAfterWrite &&
              (local[STATE_KEY] as WorkspaceState).savedTabs.length
                ? "https://example.com/changed"
                : url,
            title: "Lesson four",
            windowId: 1,
          };
        },
        async remove(id: number) {
          closed.push(id);
        },
        async query() {
          return [];
        },
      },
    },
  });
});

test("domain rules match host boundaries, not deceptive suffixes", () => {
  const rule = {
    id: "r",
    matchType: "domain" as const,
    matchValue: "github.com",
    categoryId: "dev",
  };
  assert.equal(matchesRule("https://github.com/a", rule), true);
  assert.equal(matchesRule("https://docs.github.com/a", rule), true);
  assert.equal(matchesRule("https://github.com.evil.test/a", rule), false);
  assert.equal(matchesRule("https://notgithub.com/a", rule), false);
  assert.equal(matchesRule("https://github.com@evil.test/a", rule), false);
});
test("path rules distinguish LinkedIn jobs from other LinkedIn pages", () => {
  const state = initialState();
  assert.equal(
    suggestedCategory(state, "https://www.linkedin.com/jobs/view/123"),
    "jobs",
  );
  assert.equal(
    suggestedCategory(state, "https://www.linkedin.com/feed/"),
    "other",
  );
});
test("unsupported schemes are never saveable", () => {
  for (const url of [
    "javascript:alert(1)",
    "chrome://settings",
    "file:///tmp/a",
    "data:text/html,hi",
    "not a URL",
  ])
    assert.equal(isWebUrl(url), false);
  assert.equal(isWebUrl("http://localhost:3000"), true);
});
test("a repeated save keeps the note, status, ID and date", () => {
  const state = initialState();
  const first = upsertSaved(state, {
    url,
    title: "Lesson",
    favicon: "",
    categoryId: "english",
    note: "Unit 4",
    favorite: true,
  });
  const second = upsertSaved(state, {
    url,
    title: "Updated title",
    favicon: "",
    categoryId: "english",
  });
  assert.equal(state.savedTabs.length, 1);
  assert.equal(first.id, second.id);
  assert.equal(second.note, "Unit 4");
  assert.equal(second.favorite, true);
});
test("deleting a category defaults can preserve pages and removes stale rules", () => {
  const state = initialState();
  upsertSaved(state, {
    url,
    title: "Job",
    favicon: "",
    categoryId: "jobs",
    note: "Apply tomorrow",
  });
  deleteCategory(state, "jobs", "uncategorized");
  assert.equal(state.savedTabs[0].categoryId, null);
  assert.equal(state.savedTabs[0].note, "Apply tomorrow");
  assert.equal(
    state.rules.some((r) => r.categoryId === "jobs"),
    false,
  );
});
test("move and destructive category deletion are explicit and distinct", () => {
  const state = initialState();
  upsertSaved(state, { url, title: "Job", favicon: "", categoryId: "jobs" });
  assert.throws(() => deleteCategory(state, "jobs", "move", "jobs"));
  deleteCategory(state, "jobs", "move", "projects");
  assert.equal(state.savedTabs[0].categoryId, "projects");
  deleteCategory(state, "projects", "delete");
  assert.equal(state.savedTabs.length, 0);
});
test("search is case-insensitive across titles, notes and category names", () => {
  assert.equal(
    matchesSearch("unit english", ["BBC", "Unit 4 Lesson 6", "English"]),
    true,
  );
  assert.equal(matchesSearch("oauth", ["OAuth explained", "Dev"]), true);
  assert.equal(matchesSearch("unit sap", ["Unit 4", "English"]), false);
});
test("park persists the URL and note before closing", async () => {
  await execute({
    type: "tab.save",
    tabId: 12,
    url,
    categoryId: "english",
    note: "Unit 4",
    close: true,
  });
  assert.deepEqual(closed, [12]);
  const record = (local[STATE_KEY] as WorkspaceState).savedTabs[0];
  assert.equal(record.url, url);
  assert.equal(record.note, "Unit 4");
});
test("quota failure leaves the tab open and existing storage intact", async () => {
  writesFail = true;
  await assert.rejects(
    execute({
      type: "tab.save",
      tabId: 12,
      url,
      categoryId: "english",
      close: true,
    }),
    /QUOTA/,
  );
  assert.deepEqual(closed, []);
  assert.equal((local[STATE_KEY] as WorkspaceState).savedTabs.length, 0);
});
test("readback failure does not close the original tab", async () => {
  corruptReadback = true;
  await assert.rejects(
    execute({
      type: "tab.save",
      tabId: 12,
      url,
      categoryId: "english",
      close: true,
    }),
    /verify/,
  );
  assert.deepEqual(closed, []);
});
test("navigation after persistence leaves the changed tab open", async () => {
  navAfterWrite = true;
  const result = await execute({
    type: "tab.save",
    tabId: 12,
    url,
    categoryId: "english",
    close: true,
  });
  assert.match(result.notice!, /did not close/);
  assert.deepEqual(closed, []);
  assert.equal((local[STATE_KEY] as WorkspaceState).savedTabs[0].url, url);
});
test("a stale panel cannot close a tab that navigated", async () => {
  await assert.rejects(
    execute({
      type: "tab.save",
      tabId: 12,
      url: "https://example.org/old",
      categoryId: "english",
      close: true,
    }),
    /changed/,
  );
  assert.deepEqual(closed, []);
});
test("save without parking keeps the live tab open", async () => {
  await execute({
    type: "tab.save",
    tabId: 12,
    url,
    categoryId: "english",
    close: false,
  });
  assert.deepEqual(closed, []);
  assert.equal((local[STATE_KEY] as WorkspaceState).savedTabs.length, 1);
});
test("unknown storage schema fails closed instead of resetting saved data", async () => {
  local[STATE_KEY] = { version: 99, savedTabs: ["keep me"] };
  await assert.rejects(
    execute({
      type: "tab.save",
      tabId: 12,
      url,
      categoryId: null,
      close: true,
    }),
    /not been changed/,
  );
  assert.deepEqual(local[STATE_KEY], { version: 99, savedTabs: ["keep me"] });
  assert.deepEqual(closed, []);
});

test("folder color is persisted while old IDs and notes survive", async () => {
  const state = local[STATE_KEY] as WorkspaceState;
  upsertSaved(state, {
    url,
    title: "Lesson",
    favicon: "",
    categoryId: "english",
    note: "Unit 4",
  });
  const original = structuredClone(state.savedTabs[0]);
  await execute({
    type: "category.upsert",
    id: "english",
    name: "English",
    icon: "",
    kind: "general",
    groupOnOpen: false,
    color: "#D3968C",
  });
  const result = local[STATE_KEY] as WorkspaceState;
  assert.equal(
    result.categories.find((c) => c.id === "english")?.color,
    "#D3968C",
  );
  assert.deepEqual(result.savedTabs[0], original);
  await assert.rejects(
    execute({
      type: "category.upsert",
      id: "english",
      name: "English",
      icon: "",
      kind: "general",
      groupOnOpen: false,
      color: "#badbad",
    }),
    /Paletten/,
  );
});
test("folder delete and undo restores records, rules, colors and live assignments", async () => {
  const state = local[STATE_KEY] as WorkspaceState;
  upsertSaved(state, {
    url,
    title: "Job",
    favicon: "",
    categoryId: "jobs",
    note: "Başvurulacak",
    favorite: true,
  });
  state.categories.find((c) => c.id === "jobs")!.color = "#105666";
  session["tabshelf.assignments"] = { "12": { url, categoryId: "jobs" } };
  const before = structuredClone(state);
  const deletion = await execute({
    type: "category.delete",
    id: "jobs",
    disposition: "uncategorized",
  });
  assert.equal(
    (local[STATE_KEY] as WorkspaceState).savedTabs[0].categoryId,
    null,
  );
  assert.equal(
    (local[STATE_KEY] as WorkspaceState).savedTabs[0].note,
    "Başvurulacak",
  );
  await execute({ type: "undo", token: deletion.undoToken! });
  assert.deepEqual(local[STATE_KEY], before);
  assert.deepEqual(session["tabshelf.assignments"], {
    "12": { url, categoryId: "jobs" },
  });
  await assert.rejects(
    execute({ type: "undo", token: deletion.undoToken! }),
    /artık/,
  );
});
test("undo cannot overwrite a later edit from another panel", async () => {
  const state = local[STATE_KEY] as WorkspaceState;
  const item = upsertSaved(state, {
    url,
    title: "Lesson",
    favicon: "",
    categoryId: "english",
    note: "Keep me",
  });
  const deletion = await execute({ type: "saved.delete", id: item.id });
  await execute({
    type: "category.upsert",
    name: "New folder",
    icon: "",
    kind: "general",
    groupOnOpen: false,
  });
  const afterEdit = structuredClone(local[STATE_KEY]);
  await assert.rejects(
    execute({ type: "undo", token: deletion.undoToken! }),
    /değiştiği/,
  );
  assert.deepEqual(local[STATE_KEY], afterEdit);
});
test("failed deletion keeps all data and returns no false undo state", async () => {
  const before = structuredClone(local[STATE_KEY]);
  writesFail = true;
  await assert.rejects(
    execute({ type: "category.delete", id: "jobs", disposition: "delete" }),
    /QUOTA/,
  );
  assert.deepEqual(local[STATE_KEY], before);
  assert.equal(local["ayrac.undo"], undefined);
});
test("undo handles moving an empty folder with a live assignment", async () => {
  session["tabshelf.assignments"] = { "12": { url, categoryId: "jobs" } };
  const deletion = await execute({
    type: "category.delete",
    id: "jobs",
    disposition: "move",
    targetId: "dev",
  });
  await execute({ type: "undo", token: deletion.undoToken! });
  assert.deepEqual(session["tabshelf.assignments"], {
    "12": { url, categoryId: "jobs" },
  });
});
