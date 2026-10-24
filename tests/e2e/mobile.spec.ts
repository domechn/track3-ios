import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { installTauriBridge } from "./tauri-bridge";

const routes = [
  "overview", "history", "summary", "wallets", "comparison", "cost-basis", "coins/BTC", "more", "goals",
];
const sizes = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

let browserErrors: string[];
test.beforeEach(() => { browserErrors = []; });
test.afterEach(() => { expect(browserErrors).toEqual([]); });

function watchPage(page: Page) {
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  return page;
}

test("the iOS viewport permits text zoom", async ({ page }) => {
  watchPage(page);
  await installTauriBridge(page);
  await page.goto("/");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("viewport-fit=cover");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale=1");
});

test("a first launch portfolio offers a direct source setup action", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page, undefined, false, false, true);
    await page.goto("/#/overview");
    await expect(page.getByRole("button", { name: "Add your first source" })).toBeVisible();
    await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
    mkdirSync("test-results/mobile", { recursive: true });
    await page.screenshot({ path: "test-results/mobile/390x844-first-launch.png" });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => localStorage.setItem("track3-ui-theme", "system"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Add your first source" })).toBeVisible();
    await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
    await page.screenshot({ path: "test-results/mobile/390x844-first-launch-dark.png" });
    await page.getByRole("button", { name: "Add your first source" }).click();
    await expect(page).toHaveURL(/#\/settings\/configuration/);
  } finally {
    await context.close();
  }
});

test("review screenshots have several assets and a multi-month trend", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page, undefined, false, false, false, false, true);
    await page.goto("/#/overview");
    await expect(page.locator(".mobile-allocation-row")).toHaveCount(5, { timeout: 5_000 });
    await expect(page.getByRole("button", { name: "Next token holdings page" })).toBeVisible();
    await expect(page.locator(".mobile-hero-value")).not.toContainText("$42,000.00");
    await expect(page.locator(".mobile-hero-dates")).toContainText("Aug 24");
    await expect(page.locator(".mobile-hero-dates")).toContainText("Oct 22");
    const movers = (await page.locator(".profit-mobile-list").allTextContents()).join(" ");
    expect(movers).toMatch(/\+\$/);
    expect(movers).toMatch(/-\$/);
    const chart = page.locator(".overview-main-grid canvas").last();
    const initialHeight = (await chart.boundingBox())?.height;
    expect(initialHeight).toBeGreaterThanOrEqual(150);
    expect(initialHeight).toBeLessThanOrEqual(190);
    await page.waitForTimeout(500);
    expect((await chart.boundingBox())?.height).toBe(initialHeight);
    expect(await page.locator(".mobile-hero-value").evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(44);
    await expect(page.locator(".mobile-allocation-row .mobile-allocation-swatch")).toHaveCount(5);
    await expect(page.locator(".mobile-allocation-center")).toContainText("$");
    const [gains, losses] = await page.locator(".profit-mobile-list").allTextContents();
    expect(gains).not.toContain("-$");
    expect(losses).not.toContain("+$");
    await expect(page.getByRole("region", { name: "Insights" })).not.toContainText("No significant changes yet");
    await expect(page.getByRole("region", { name: "Insights" })).toContainText("$7,298.27");
    await expect(page.locator(".mobile-hero-change")).not.toContainText("2026-");
    await expect(page.locator("#app-top-bar .mobile-nav-brand")).toBeVisible();
    await expect(page.locator(".overview-insights .mobile-section-header")).toContainText("Insights");
    await expect(page.getByRole("button", { name: "Show percentage change in chart" })).toContainText("Percent");
    await expect(page.getByRole("button", { name: "Switch total value base currency" })).toContainText("BTC base");
  } finally {
    await context.close();
  }
});

test("touching the trend reveals a readable value chip", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page, undefined, false, false, false, false, true);
    await page.goto("/#/overview");
    const chart = page.locator(".mobile-hero-chart canvas");
    await expect(chart).toBeVisible();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const size of sizes) {
  test(`data routes fit an iPhone viewport at ${size.width}x${size.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = watchPage(await context.newPage());
    mkdirSync("test-results/mobile", { recursive: true });
    try {
      await installTauriBridge(page, undefined, false, false, false, false, true);
      for (const route of routes) {
        await page.goto(`/#/${route}`);
        await expect(page.locator(".mobile-tab-bar")).toBeVisible();
        await expect(page.locator("#app-main-content")).toBeVisible();
        await expect.poll(() => page.locator(".app-content").evaluate((node) => getComputedStyle(node).marginLeft)).toBe("0px");
        await expect(page.locator(route === "history" ? ".history-mobile-list"
          : route === "cost-basis" ? "#app-main-content .mobile-large-title"
          : route === "more" ? ".mobile-more-hub"
          : route === "goals" ? "#app-main-content h1:not(.mobile-large-title)"
          : "#app-main-content .mobile-large-title")).toBeAttached({ timeout: route === routes[0] ? 20_000 : 5_000 });
        if (!["more", "goals"].includes(route)) {
          await expect(page.locator("#app-main-content h1")).toHaveCount(1);
        }
        await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
        if (route.startsWith("coins/")) {
          await expect(page.getByTestId("coin-page-loading-overlay")).toHaveClass(/opacity-0/);
          await expect.poll(() => page.getByTestId("coin-page-loading-overlay")
            .evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
        }
        if (route === "overview") {
          await expect(page.locator(".mobile-hero-value")).toBeVisible();
          await expect(page.locator(".mobile-allocation-row")).toHaveCount(5);
        }
        await page.evaluate(() => document.fonts.ready);
        const screenshot = await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-${route.replace("/", "-")}.png` });
        expect(screenshot.readUInt32BE(16)).toBe(size.width * 2);
        expect(screenshot.readUInt32BE(20)).toBe(size.height * 2);
        const metrics = await page.evaluate(() => ({
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          mainBottomPadding: parseFloat(getComputedStyle(document.querySelector("#app-main-content")!).paddingBottom),
          safeBottomDelta: (() => {
            const main = document.querySelector<HTMLElement>("#app-main-content")!;
            const before = parseFloat(getComputedStyle(main).paddingBottom);
            main.style.setProperty("--mobile-safe-bottom", "31px");
            const after = parseFloat(getComputedStyle(main).paddingBottom);
            main.style.removeProperty("--mobile-safe-bottom");
            return after - before;
          })(),
          tabHeight: document.querySelector(".mobile-tab-bar")!.getBoundingClientRect().height,
          overflowElements: [...document.querySelectorAll<HTMLElement>("body *")].filter((node) =>
            node.getBoundingClientRect().right > document.documentElement.clientWidth + 2 &&
            getComputedStyle(node).position !== "fixed").slice(0, 8).map((node) => ({
              tag: node.tagName, cls: String(node.className).slice(0, 60), right: node.getBoundingClientRect().right,
            })),
          clipped: [...document.querySelectorAll<HTMLElement>("#app-main-content *")].filter((node) => {
            const style = getComputedStyle(node);
            return node.children.length === 0 && node.getClientRects().length > 0 &&
              !node.closest(".sr-only") && node.textContent?.trim() &&
              node.scrollWidth > node.clientWidth + 2 && ["hidden", "clip"].includes(style.overflowX);
          }).slice(0, 5).map((node) => ({ text: node.textContent?.slice(0, 35), width: node.clientWidth, scroll: node.scrollWidth })),
        }));
        expect(metrics.clipped, `${route}: clipped text`).toEqual([]);
        expect(metrics.pageWidth, `${route}: document overflow ${JSON.stringify(metrics.overflowElements)}`).toBeLessThanOrEqual(metrics.viewportWidth);
        expect(metrics.mainBottomPadding, `${route}: home indicator clearance`).toBeGreaterThanOrEqual(metrics.tabHeight);
        expect(metrics.safeBottomDelta, `${route}: safe-area inset is ignored`).toBe(31);
        if (route === "history") {
          await expect(page.locator("#app-main-content h1")).toHaveCount(1);
          await page.locator(".history-mobile-list").scrollIntoViewIfNeeded();
          await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-history-list.png` });
        }
      }
      if (size.width === 320 || size.width === 390) {
        await page.goto("/#/overview");
        await page.reload();
        await expect(page.locator(".mobile-allocation-row")).toHaveCount(5);
        await page.locator(".overview-main-grid > :nth-child(2)").evaluate((card) =>
          window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 100));
        await expect.poll(() => page.locator(".overview-main-grid > :nth-child(2)")
          .evaluate((card) => Math.round(card.getBoundingClientRect().top))).toBeLessThanOrEqual(110);
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-performance.png` });
        await page.locator(".overview-allocation-card").scrollIntoViewIfNeeded();
        await page.locator(".overview-allocation-card").evaluate((card) =>
          window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 100));
        await expect.poll(() => page.locator(".overview-allocation-card")
          .evaluate((card) => Math.round(card.getBoundingClientRect().top))).toBeLessThanOrEqual(110);
        await expect(page.locator(".mobile-header-total-value")).toBeVisible();
        await expect(page.locator(".mobile-header-total-value")).toHaveText(
          (await page.locator(".mobile-hero-value").textContent()) ?? "",
        );
        expect(await page.locator(".mobile-header-total-value").evaluate((node) =>
          node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-details.png` });
        await page.locator(".overview-movers-card").evaluate((card) =>
          window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 100));
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-movers.png` });
        await page.locator(".overview-source-teaser").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-bottom.png` });
        await page.emulateMedia({ colorScheme: "dark" });
        await page.evaluate(() => localStorage.setItem("track3-ui-theme", "system"));
        await page.reload();
        for (const route of routes) {
          await page.goto(`/#/${route}`);
          await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
          await expect(page.locator("html")).toHaveClass(/dark/);
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-${route.replace("/", "-")}-dark.png` });
        }
        await page.goto("/#/overview");
        await page.reload();
        await expect(page.locator(".mobile-allocation-row")).toHaveCount(5);
        await page.locator(".overview-main-grid > :nth-child(2)").evaluate((card) =>
          window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 100));
        await expect.poll(() => page.locator(".overview-main-grid > :nth-child(2)")
          .evaluate((card) => Math.round(card.getBoundingClientRect().top))).toBeLessThanOrEqual(110);
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-performance-dark.png` });
        await page.locator(".overview-allocation-card").scrollIntoViewIfNeeded();
        await page.locator(".overview-allocation-card").evaluate((card) =>
          window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 100));
        await expect.poll(() => page.locator(".overview-allocation-card")
          .evaluate((card) => Math.round(card.getBoundingClientRect().top))).toBeLessThanOrEqual(110);
        await expect(page.locator(".mobile-header-total-value")).toBeVisible();
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-details-dark.png` });
        await page.locator(".overview-movers-card").evaluate((card) =>
          window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 100));
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-movers-dark.png` });
        await page.locator(".overview-source-teaser").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-overview-bottom-dark.png` });
      }
    } finally {
      await context.close();
    }
  });
}

for (const width of [844, 932]) {
test(`a ${width}pt landscape iPhone keeps the touch shell`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 390 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await expect(page.locator(".mobile-tab-bar")).toBeVisible();
    await expect(page.locator(".mobile-route-heading")).toBeVisible();
    await expect(page.locator(".app-layout > aside")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
}

test("history snapshots use touch rows and a detail sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/history");
    const row = page.getByTestId("history-mobile-row").first();
    await expect(row).toBeVisible();
    await expect(row.locator(".image-stack img")).not.toHaveCount(0);
    await row.click();
    const detail = page.getByRole("dialog", { name: /historical data detail/i });
    await expect(detail).toBeVisible();
    await expect.poll(async () => (await detail.boundingBox())?.x).toBe(0);
    await detail.getByRole("button", { name: "Close" }).click();
    await expect(row).toBeVisible();
  } finally {
    await context.close();
  }
});

test("history swipe reveals delete, then confirm and undo restore the row", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/history");
    const row = page.locator("[data-swipeable-row]").first();
    await expect(row).toBeVisible();
    await row.scrollIntoViewIfNeeded();
    expect(await row.evaluate((node) => getComputedStyle(node).touchAction)).toBe("pan-y");
    await page.evaluate(() => window.scrollBy(0, 300));
    const box = (await row.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const startX = box.x + box.width - 12;
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
    for (let step = 1; step <= 5; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
        touchPoints: [{ x: startX - step * 22, y: y + 2 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(row.locator(".mobile-swipe-actions")).toHaveClass(/mobile-swipe-actions-revealed/);
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog", { name: /delete/i })).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    const close = page.locator("[toast-close]").last();
    await expect(close).toHaveCSS("opacity", "1");
    await expect(close).toHaveAccessibleName("Close");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("history-mobile-row")).toHaveCount(2);
  } finally {
    await context.close();
  }
});

test("history pagination controls stay together at phone width", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/history");
    const previous = await page.getByRole("button", { name: "Previous page" }).boundingBox();
    const next = await page.getByRole("button", { name: "Next page" }).boundingBox();
    expect(previous).not.toBeNull();
    expect(next).not.toBeNull();
    expect(Math.abs((next!.y + next!.height / 2) - (previous!.y + previous!.height / 2))).toBeLessThan(2);
  } finally {
    await context.close();
  }
});

test("the portfolio date range opens a native date sheet on phones", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Choose date range" }).click();
    const sheet = page.getByRole("dialog", { name: "Choose date range" });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('input[type="date"]')).toHaveCount(2);
  } finally {
    await context.close();
  }
});

test("comparison dates use a snapshot selection sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/comparison");
    await page.getByRole("button", { name: /base date/i }).click();
    const sheet = page.getByRole("dialog", { name: /base date/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: /2024/ }).first()).toBeVisible();
    const dateInput = sheet.locator('input[type="date"]');
    await expect.poll(() => dateInput.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
    await page.evaluate(() => window.scrollTo(0, 0));
    const handle = sheet.locator(".mobile-sheet-handle-area");
    const swipeHandle = async (fromX: number, fromY: number, toX: number, toY: number) => {
      await handle.evaluate((element, points) => {
        const touch = (x: number, y: number) => new Touch({ identifier: 1, target: element, clientX: x, clientY: y });
        const start = touch(points.fromX, points.fromY);
        const end = touch(points.toX, points.toY);
        element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start], changedTouches: [start] }));
        element.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [end], changedTouches: [end] }));
        element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [end] }));
      }, { fromX, fromY, toX, toY });
    };
    await swipeHandle(100, 100, 102, 205);
    await expect(page.locator(".mobile-pull-indicator")).toHaveCount(0);
    await swipeHandle(5, 100, 110, 190);
    await expect(page).toHaveURL(/#\/comparison$/);
  } finally {
    await context.close();
  }
});

test("the More route is visible on desktop", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/more");
    await expect(page.locator(".mobile-more-hub")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a bottom sheet follows the handle between medium and large detents", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/comparison");
    await page.getByRole("button", { name: /base date/i }).click();
    const sheet = page.getByRole("dialog", { name: /base date/i });
    const handle = sheet.locator(".mobile-sheet-handle-area");
    const medium = (await sheet.boundingBox())!.height;
    const start = (await handle.boundingBox())!;
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 100, { steps: 5 });
    expect((await sheet.boundingBox())!.height).toBeGreaterThan(medium + 50);
    await page.mouse.up();
    await expect(sheet).toHaveClass(/mobile-sheet-large/);
    const large = (await sheet.boundingBox())!.height;
    const next = (await handle.boundingBox())!;
    const nextY = next.y + next.height / 2;
    await page.mouse.move(x, nextY);
    await page.mouse.down();
    await page.mouse.move(x, nextY + 100, { steps: 5 });
    expect((await sheet.boundingBox())!.height).toBeLessThan(large - 50);
    await page.mouse.up();
    await expect(sheet).toHaveClass(/mobile-sheet-medium/);
  } finally {
    await context.close();
  }
});

test("comparison range choices respond to a horizontal swipe", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/comparison");
    const week = page.getByRole("radio", { name: "7D" });
    await week.click();
    await expect(week).toHaveAttribute("aria-checked", "true");
    const selector = week.locator("..");
    await selector.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 200, clientY: 20 }] });
    await selector.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: 110, clientY: 22 }] });
    await expect(page.getByRole("radio", { name: "1M" })).toHaveAttribute("aria-checked", "true");
  } finally {
    await context.close();
  }
});

test("coin transactions open as detail rows with edit actions", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page, undefined, true);
    await page.goto("/#/coins/BTC");
    await expect(page.locator(".coin-mobile-transactions")).toBeVisible();
    await page.locator(".coin-mobile-transactions .mobile-list-row").first().click();
    await expect(page.getByRole("dialog", { name: /BTC/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /update buy\/sell price/i })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("coin switching opens a searchable sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/coins/BTC");
    await page.getByRole("combobox", { name: /symbol/i }).click();
    await expect(page.getByRole("dialog", { name: /symbol/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    await expect.poll(() => page.getByPlaceholder(/search/i).evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
  } finally {
    await context.close();
  }
});

test("expanded overview rankings fit the phone card", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Show More" }).click();
    const ranking = page.locator(".top-coins-rank-mobile .mobile-list-row").first();
    await expect(ranking).toBeVisible();
    expect((await ranking.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    const row = page.getByTestId("tcpc-row").first();
    await expect(row).toBeVisible();
    expect((await row.getByTestId("tcpc-symbol").boundingBox())!.width).toBeGreaterThanOrEqual(40);
    for (const sort of ["tcpc-sort-value", "tcpc-sort-price"]) {
      const button = page.getByTestId(sort);
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
      expect((await button.boundingBox())!.width).toBeGreaterThanOrEqual(43.9);
    }
    const metrics = await row.evaluate((node) => {
      const frame = node.getBoundingClientRect();
      const main = document.querySelector("#app-main-content")!;
      const mainRight = main.getBoundingClientRect().right - parseFloat(getComputedStyle(main).paddingRight);
      return [
        frame.right - mainRight,
        ...[...node.children].filter((child) => getComputedStyle(child).display !== "none")
          .map((child) => child.getBoundingClientRect().right - frame.right),
      ];
    });
    expect(Math.max(...metrics)).toBeLessThanOrEqual(1);
    await ranking.click();
    await expect(page).toHaveURL(/#\/coins\//);
  } finally {
    await context.close();
  }
});

test("portfolio change can switch from percent to value by touch", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    const toggle = page.getByRole("button", { name: "Toggle change display" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("%");
    await toggle.click();
    await expect(toggle).toContainText("$");
  } finally {
    await context.close();
  }
});

test("insight actions fit full size phone touch targets", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page, undefined, true);
    await page.goto("/#/assistant");
    const card = page.getByRole("region", { name: "Insights" });
    await expect(card).toBeVisible();
    for (const control of [
      card.getByRole("button", { name: "Regenerate" }),
      card.getByRole("link", { name: "Ask the assistant" }),
      card.getByRole("button", { name: "Dismiss insight" }),
    ]) {
      await expect(control).toBeVisible();
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    }
    const cardBox = (await card.boundingBox())!;
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(375);
  } finally {
    await context.close();
  }
});

test("wallet changes open a detail sheet with available actions", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/wallets");
    const row = page.locator(".wallet-change-mobile-list .mobile-list-row").first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByRole("dialog", { name: /wallet-1/i })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("wallet allocation has a full size touch row for each source", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/wallets");
    const row = page.locator(".wallet-allocation-mobile-list .mobile-list-row").first();
    await expect(row).toBeVisible();
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  } finally {
    await context.close();
  }
});

test("large route titles collapse into the sticky header while scrolling", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await expect(page.getByRole("button", { name: "Show More" })).toBeVisible();
    await expect(page.locator("#app-top-bar .mr-4")).toHaveCount(0);
    await expect(page.locator("#app-top-bar .mobile-compact-title")).toBeHidden();
    await page.evaluate(() => scrollTo(0, 180));
    await expect(page.locator("#app-top-bar .mobile-compact-title")).toBeVisible();
    await expect(page.locator("#app-top-bar")).toContainText("Overview");
  } finally {
    await context.close();
  }
});

test("back navigation returns to the previous page in the More tab", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/more");
    await page.locator(".mobile-more-hub").getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await page.getByRole("navigation", { name: /settings sections/i }).getByRole("link", { name: "Appearance" }).click();
    await expect(page).toHaveURL(/#\/settings\/appearance\?section=theme$/);
    await expect(page.getByRole("heading", { level: 1, name: "Appearance" })).toBeVisible();
    await page.locator("#app-top-bar").getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await page.locator("#app-top-bar").getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/#\/more$/);
  } finally {
    await context.close();
  }
});

test("pushing a detail route starts at the top with a sticky Back control", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Show More" }).click();
    await page.evaluate(() => scrollTo(0, 1000));
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(500);
    await page.locator(".top-coins-rank-mobile .mobile-list-row").first().click();
    await expect(page).toHaveURL(/#\/coins\//);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const back = page.locator("#app-top-bar").getByRole("button", { name: "Back" });
    await expect(back).toBeVisible();
    expect((await back.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    await page.evaluate(() => scrollTo(0, 180));
    await expect(page.locator("#app-top-bar .mobile-compact-title")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("tab switches restore position and tapping the active tab returns to its root", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Show More" }).click();
    await page.evaluate(() => scrollTo(0, 500));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "History" }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Overview" }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Overview" }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.getByRole("button", { name: "Show More" }).click();
    await page.locator(".top-coins-rank-mobile .mobile-list-row").first().click();
    await expect(page).toHaveURL(/#\/coins\//);
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/#\/summary$/);
  } finally {
    await context.close();
  }
});

test("Analytics opens its subpages and Back returns to Analytics", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/summary");
    const links = page.locator(".mobile-analytics-hub");
    for (const name of ["Wallets", "Comparison", "Cost basis"]) {
      await expect(links.getByRole("link", { name })).toBeVisible();
    }
    await links.getByRole("link", { name: "Wallets" }).click();
    await expect(page).toHaveURL(/#\/wallets$/);
    await page.locator("#app-top-bar").getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/#\/summary$/);
  } finally {
    await context.close();
  }
});

test("the latest history snapshot has a visible delete action in its detail", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/history");
    await page.getByTestId("history-mobile-row").first().click();
    const detail = page.getByRole("dialog", { name: /historical data detail/i });
    await expect(detail.getByRole("button", { name: "Delete snapshot" })).toBeVisible();
    await detail.getByRole("button", { name: "Delete snapshot" }).click();
    await expect(page.getByRole("alertdialog", { name: /delete/i })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("wide touch screens do not activate phone gestures", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/coins/BTC");
    const main = page.locator("#app-main-content");
    await main.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 5, clientY: 80 }] });
    await main.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: 140, clientY: 81 }] });
    await expect(page).toHaveURL(/#\/coins\/BTC$/);
    const pull = page.getByTestId("pull-to-refresh");
    await pull.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 100, clientY: 80 }] });
    await pull.dispatchEvent("touchmove", { touches: [{ identifier: 1, clientX: 100, clientY: 150 }] });
    await expect(page.locator(".mobile-pull-indicator")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("refresh source status rises from the bottom as a sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByRole("button", { name: /source status/i }).click();
    const sheet = page.getByRole("alertdialog");
    await expect(sheet).toBeVisible();
    await expect.poll(async () => {
      const box = await sheet.boundingBox();
      return box ? box.y + box.height : 0;
    }).toBe(844);
  } finally {
    await context.close();
  }
});

test("pulling down reveals the last refresh time", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await expect(page.getByRole("button", { name: "Show More" })).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 140 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 185 }] });
    await expect(page.locator(".mobile-pull-indicator")).toContainText(/Last Refresh At:|Never Refresh Before/);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await context.close();
  }
});

test("a scrolled inner area does not pull the page to refresh", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    const bridge = await installTauriBridge(page);
    await page.goto("/#/overview");
    await expect(page.getByRole("button", { name: "Show More" })).toBeVisible();
    const inner = page.getByTestId("pull-to-refresh").evaluate((main) => {
      const area = document.createElement("div");
      area.style.cssText = "height: 80px; overflow-y: auto";
      area.innerHTML = '<div style="height: 240px">Inner content</div>';
      main.prepend(area);
      area.scrollTop = 50;
      return area.scrollTop;
    });
    expect(await inner).toBe(50);
    const target = page.getByText("Inner content");
    await target.evaluate((element) => {
      const touch = (y: number) => new Touch({ identifier: 1, target: element, clientX: 100, clientY: y });
      for (const [type, y] of [["touchstart", 20], ["touchmove", 100]] as const) {
        const point = touch(y);
        element.dispatchEvent(new TouchEvent(type, {
          bubbles: true, touches: [point], changedTouches: [point],
        }));
      }
    });
    await expect(page.locator(".mobile-pull-indicator")).toHaveCount(0);
    await target.evaluate((element) => {
      const point = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 100 });
      element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [point] }));
    });
    expect(bridge.persistedRefreshes()).toBe(0);
  } finally {
    await context.close();
  }
});

test("pulling the assistant thread does not refresh the portfolio", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = watchPage(await context.newPage());
  try {
    const bridge = await installTauriBridge(page);
    await page.goto("/#/assistant");
    const thread = page.getByTestId("chat-thread");
    await expect(thread).toBeVisible();
    await thread.evaluate((element) => {
      const touch = (y: number) => new Touch({ identifier: 1, target: element, clientX: 100, clientY: y });
      for (const [type, y] of [["touchstart", 20], ["touchmove", 100]] as const) {
        const point = touch(y);
        element.dispatchEvent(new TouchEvent(type, {
          bubbles: true, touches: [point], changedTouches: [point],
        }));
      }
    });
    await expect(page.locator(".mobile-pull-indicator")).toHaveCount(0);
    await thread.evaluate((element) => {
      const point = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 100 });
      element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [point] }));
    });
    expect(bridge.persistedRefreshes()).toBe(0);
  } finally {
    await context.close();
  }
});

for (const width of [320, 375]) {
  test(`comparison totals stay on separate unbroken lines at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 667 }, isMobile: true, hasTouch: true });
    const page = watchPage(await context.newPage());
    try {
      await installTauriBridge(page);
      await page.goto("/#/comparison");
      const totals = page.locator(".comparison-total-grid");
      await expect(totals).toBeVisible();
      const values = totals.locator("> div > p:nth-child(2)");
      await expect(values).toHaveCount(3);
      const [base, head] = await Promise.all([values.nth(0).boundingBox(), values.nth(2).boundingBox()]);
      expect(head!.y).toBeGreaterThanOrEqual(base!.y + base!.height);
      for (const value of [values.nth(0), values.nth(2)]) {
        expect(await value.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe("nowrap");
        expect(await value.evaluate((node) => getComputedStyle(node).overflowWrap)).toBe("normal");
        expect(await value.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
          await value.evaluate((node) => node.clientWidth),
        );
      }
    } finally {
      await context.close();
    }
  });
}
