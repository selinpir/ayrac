// Requires full Chromium with extension support, not chromium-headless-shell.
import { chromium } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const extension = resolve("dist");
const profile = await mkdtemp(join(tmpdir(), "tabshelf-e2e-"));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: process.env.HEADED !== "1",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 380, height: 850 },
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  await context.route("https://tabshelf-example.test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Lesson 4</title><h1>Local test fixture</h1>",
    }),
  );
  const fixture = await context.newPage();
  await fixture.goto("https://tabshelf-example.test/lesson");
  const panel = await context.newPage();
  const errors = [];
  panel.on("pageerror", (e) => errors.push(e.message));
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel
    .getByRole("navigation")
    .getByRole("button", { name: /Açık sekmeler/ })
    .click();
  await panel
    .getByRole("button", { name: "Diğer işlemler: Lesson 4", exact: true })
    .click();
  await panel
    .getByRole("textbox", { name: /Nerede kaldın/ })
    .fill("Unit 4, lesson 6");
  await panel
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet ve kapat", exact: true })
    .click();
  await panel.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(fixture.isClosed(), true);
  await panel
    .getByRole("navigation")
    .getByRole("button", { name: "Klasörler", exact: true })
    .click();
  await panel.getByRole("button", { name: /Tüm bağlantılar/ }).click();
  await panel
    .getByRole("button", { name: /^(Aç|Sekmeye git): Lesson 4$/ })
    .click();
  await panel
    .getByRole("button", { name: /^(Aç|Sekmeye git): Lesson 4$/ })
    .click();
  const tabs = await worker.evaluate(() => chrome.tabs.query({}));
  assert.equal(
    tabs.filter((t) => t.url === "https://tabshelf-example.test/lesson").length,
    1,
  );
  await panel.reload();
  await panel
    .getByRole("navigation")
    .getByRole("button", { name: "Klasörler", exact: true })
    .click();
  await panel.getByRole("button", { name: /Tüm bağlantılar/ }).click();
  await panel.getByText("Unit 4, lesson 6", { exact: true }).waitFor();
  const behavior = await worker.evaluate(() =>
    chrome.sidePanel.getPanelBehavior(),
  );
  assert.equal(behavior.openPanelOnActionClick, true);
  assert.deepEqual(errors, []);
  console.log(
    "PASS real extension install, park, restore, deduplication, persistence and side-panel behavior configuration.",
  );
  console.log(
    "Native toolbar / side-panel display must still be checked manually in headed Chrome.",
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
