import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";

// Standard Playwright Chromium by default. A render-only Chromium may be passed
// with CHROMIUM_PATH; this test uses a Chrome API adapter in either case.
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--disable-gpu",
  ],
});
const context = await browser.newContext({
  viewport: { width: 380, height: 850 },
  deviceScaleFactor: 2,
});
await context.addInitScript({ path: resolve("tests/chrome.mock.js") });
await context.route("https://tabshelf.test/**", async (route) => {
  const pathname = new URL(route.request().url()).pathname;
  const path = resolve("dist", "." + pathname);
  if (!path.startsWith(resolve("dist") + "/")) return route.abort();
  try {
    let body = await readFile(path);
    if (pathname === "/sidepanel.html")
      body = Buffer.from(
        body
          .toString()
          .replace(
            "</head>",
            '<script type="module" src="/background.js"></script></head>',
          ),
      );
    const type =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
      }[extname(path)] ?? "application/octet-stream";
    await route.fulfill({ contentType: type, body });
  } catch {
    await route.fulfill({ status: 404, body: "Not found" });
  }
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const send = (command) =>
  page.evaluate(async (command) => {
    const response = await chrome.runtime.sendMessage({
      channel: "tabshelf",
      command,
    });
    if (!response.ok) throw new Error(response.error);
    return response.result;
  }, command);
const state = () =>
  page.evaluate(
    async () => (await chrome.storage.local.get("tabshelf.v1"))["tabshelf.v1"],
  );
const check = async (label, work) => {
  await work();
  console.log("PASS", label);
};
try {
  await page.goto("https://tabshelf.test/sidepanel.html");
  await page.getByRole("heading", { name: "Klasörlerin" }).waitFor();
  await mkdir("docs", { recursive: true });
  await check(
    "legacy folders are retained; expanding a folder opens no tabs",
    async () => {
      assert.equal((await state()).categories.length, 13);
      const before = await page.evaluate(() => chrome.tabs.query({}));
      await page
        .getByRole("button", { name: "Günlük İngilizce 0", exact: true })
        .click();
      assert.equal(
        (await page.evaluate(() => chrome.tabs.query({}))).length,
        before.length,
      );
    },
  );
  await check(
    "create a folder with the supplied palette and edit its color",
    async () => {
      await page
        .getByRole("button", { name: "Yeni klasör", exact: true })
        .click();
      await page.getByLabel("Klasör adı").fill("Araştırmalar");
      await page
        .getByRole("radio", { name: "Gül kurusu", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Klasör oluştur", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(
        (await state()).categories.find((c) => c.name === "Araştırmalar").color,
        "#D3968C",
      );
      await page
        .getByRole("button", { name: "Araştırmalar klasör işlemleri" })
        .click();
      await page
        .getByRole("button", { name: "Adını veya rengini değiştir" })
        .click();
      await page
        .getByRole("radio", { name: "Gece yeşili", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Değişiklikleri kaydet", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(
        (await state()).categories.find((c) => c.name === "Araştırmalar").color,
        "#105666",
      );
    },
  );
  await check(
    "save keeps the tab open; save-and-close persists the note first",
    async () => {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: /Açık sekmeler/ })
        .click();
      const row = page.getByTestId("open-2");
      await row.getByRole("button", { name: "Kaydet", exact: true }).click();
      await page.waitForFunction(
        () => !document.querySelector('.app[aria-busy="true"]'),
      );
      assert.ok(
        (await page.evaluate(() => chrome.tabs.query({}))).some(
          (t) => t.id === 2,
        ),
      );
      await row.getByRole("button", { name: /Diğer işlemler/ }).click();
      await page
        .getByRole("textbox", { name: /Nerede kaldın/ })
        .fill("4. ünite · 6. ders. Kelimeleri tekrar edeceğim.");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Kaydet ve kapat", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(
        (await page.evaluate(() => chrome.tabs.query({}))).some(
          (t) => t.id === 2,
        ),
        false,
      );
      assert.equal(
        (await state()).savedTabs.find((t) => t.categoryId === "english").note,
        "4. ünite · 6. ders. Kelimeleri tekrar edeceğim.",
      );
      // Save two more representative links for the explorer screenshot.
      await page
        .getByTestId("open-1")
        .getByRole("button", { name: "Kaydet", exact: true })
        .click();
      await page.waitForFunction(
        () => !document.querySelector('.app[aria-busy="true"]'),
      );
      await page
        .getByTestId("open-6")
        .getByRole("button", { name: "Kaydet", exact: true })
        .click();
      await page.waitForFunction(
        () => !document.querySelector('.app[aria-busy="true"]'),
      );
    },
  );
  await check(
    "delete defaults to keeping links; undo restores folder and notes",
    async () => {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: "Klasörler", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Günlük İngilizce klasör işlemleri" })
        .click();
      await page
        .getByRole("button", { name: "Klasörü sil…", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Bağlantılara ne yapılsın?").inputValue(),
        "uncategorized",
      );
      const before = await state();
      await page
        .getByRole("button", { name: "Klasörü sil", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.ok(
        (await state()).savedTabs.some(
          (t) => t.note.startsWith("4. ünite") && t.categoryId === null,
        ),
      );
      await page.getByRole("button", { name: "Geri al", exact: true }).click();
      await page.waitForFunction(
        () => !document.querySelector('.app[aria-busy="true"]'),
      );
      assert.deepEqual(await state(), before);
    },
  );
  await check(
    "select saved links and open without creating duplicates",
    async () => {
      await page.getByRole("button", { name: "Seç", exact: true }).click();
      await page
        .getByRole("checkbox", { name: "Görünen bağlantıların tümünü seç" })
        .check();
      await page.getByRole("button", { name: "Seçilenleri aç" }).click();
      await page.waitForFunction(
        () => !document.querySelector('.app[aria-busy="true"]'),
      );
      await page.getByRole("button", { name: "Seçilenleri aç" }).click();
      await page.waitForFunction(
        () => !document.querySelector('.app[aria-busy="true"]'),
      );
      const live = await page.evaluate(() => chrome.tabs.query({}));
      for (const item of (await state()).savedTabs)
        assert.equal(live.filter((t) => t.url === item.url).length, 1);
      await page.getByRole("button", { name: "Seçimi kapat" }).click();
    },
  );
  await check("storage failure never closes a tab", async () => {
    await page.evaluate(() => {
      chrome.__testing.failWrites = true;
    });
    await assert.rejects(
      send({
        type: "tab.save",
        tabId: 3,
        url: "https://www.linkedin.com/jobs/view/12345",
        categoryId: "jobs",
        close: true,
      }),
      /QUOTA/,
    );
    assert.ok(
      (await page.evaluate(() => chrome.tabs.query({}))).some(
        (t) => t.id === 3,
      ),
    );
    await page.evaluate(() => {
      chrome.__testing.failWrites = false;
    });
  });
  await check(
    "reload retains palette and notes; note search reveals the folder",
    async () => {
      await page.reload();
      await page.getByRole("heading", { name: "Klasörlerin" }).waitFor();
      assert.equal(
        (await state()).categories.find((c) => c.name === "Araştırmalar").color,
        "#105666",
      );
      await page.getByRole("searchbox").fill("Kelimeleri");
      assert.equal(await page.locator(".saved-row").count(), 1);
      await page
        .getByText("4. ünite · 6. ders. Kelimeleri tekrar edeceğim.", {
          exact: true,
        })
        .waitFor();
      await page.getByRole("searchbox").fill("");
    },
  );
  await page
    .getByRole("button", { name: "Günlük İngilizce 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Yapay zekâ 1", exact: true }).click();
  await page.locator("main").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "docs/ayrac-klasorler.png" });
  await page.getByRole("button", { name: "Yeni klasör", exact: true }).click();
  await page.getByLabel("Klasör adı").fill("Yeni fikirler");
  await page.getByRole("radio", { name: "Gül kurusu", exact: true }).check();
  await page.screenshot({ path: "docs/ayrac-renk-secimi.png" });
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await check(
    "320px and 280px panels have no horizontal overflow",
    async () => {
      for (const width of [320, 280]) {
        await page.setViewportSize({ width, height: 800 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.equal(
          await page.evaluate(
            () =>
              document.querySelector("main").scrollWidth >
              document.querySelector("main").clientWidth,
          ),
          false,
        );
        if (width === 320)
          await page.screenshot({ path: "docs/ayrac-dar-panel.png" });
      }
    },
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser console exceptions");
} finally {
  await browser.close();
}
