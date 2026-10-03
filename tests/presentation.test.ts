import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/utils/model";
import {
  categoryName,
  featuredCategories,
  localizeMessage,
} from "../src/utils/presentation";

test("the original storage schema gets four home categories without migration", () => {
  const state = initialState();
  const original = structuredClone(state);
  assert.deepEqual(
    featuredCategories(state).map((c) => c.id),
    ["ai", "english", "things-to-read", "watching"],
  );
  assert.deepEqual(state, original);
});
test("Turkish display labels preserve custom category names", () => {
  const state = initialState();
  const category = state.categories.find((c) => c.id === "english")!;
  assert.equal(categoryName(category), "Günlük İngilizce");
  category.name = "My English practice";
  assert.equal(categoryName(category), "My English practice");
});
test("home choices and their order are honored after persistence", () => {
  const state = initialState();
  state.settings.homeCategoryIds = ["jobs", "dev", "english", "daily"];
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(
    featuredCategories(restored).map((c) => c.id),
    ["jobs", "dev", "english", "daily"],
  );
});
test("deleted categories cannot leave a broken home card", () => {
  const state = initialState();
  state.settings.homeCategoryIds = ["english", "deleted-category"];
  assert.deepEqual(
    featuredCategories(state).map((c) => c.id),
    ["english"],
  );
});
test("saving errors and park notifications explain what happened", () => {
  assert.match(localizeMessage("QUOTA_BYTES exceeded"), /Sekme açık bırakıldı/);
  assert.match(
    localizeMessage("Parked. Find it in Saved."),
    /Kaydedildi ve sekme kapatıldı/,
  );
  assert.match(
    localizeMessage(
      "3 pages ready. 1 could not open. Saved copies are intact.",
    ),
    /3 sayfa hazır.*1 sayfa açılamadı/,
  );
});
