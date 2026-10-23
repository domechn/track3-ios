import { expect, test } from "@playwright/test";
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

test("the iOS viewport permits text zoom", async ({ page }) => {
  await page.goto("/");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("viewport-fit=cover");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale=1");
});

for (const size of sizes) {
  test(`data routes fit an iPhone viewport at ${size.width}x${size.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await context.newPage();
    mkdirSync("test-results/mobile", { recursive: true });
    try {
      await installTauriBridge(page);
      for (const route of routes) {
        await page.goto(`/#/${route}`);
        await expect(page.locator(".mobile-tab-bar")).toBeVisible();
        await expect(page.locator("#app-main-content")).toBeVisible();
        await expect.poll(() => page.locator(".app-content").evaluate((node) => getComputedStyle(node).marginLeft)).toBe("0px");
        await expect(page.locator(route === "history" ? ".history-mobile-list"
          : route === "cost-basis" ? "#app-main-content h1.text-2xl"
          : route === "more" ? ".mobile-more-hub"
          : route === "goals" ? "#app-main-content h1:not(.mobile-large-title)"
          : "#app-main-content h1.sr-only")).toBeAttached();
        await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
        if (route.startsWith("coins/")) {
          await expect(page.getByTestId("coin-page-loading-overlay")).toHaveClass(/opacity-0/);
          await expect.poll(() => page.getByTestId("coin-page-loading-overlay")
            .evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
        }
        if (route === "overview") await expect(page.locator("#app-top-bar")).toContainText("$42,000.00");
        await page.evaluate(() => document.fonts.ready);
        const screenshot = await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-${route.replace("/", "-")}.png` });
        expect(screenshot.readUInt32BE(16)).toBe(size.width * 2);
        expect(screenshot.readUInt32BE(20)).toBe(size.height * 2);
        const metrics = await page.evaluate(() => ({
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          mainBottomPadding: parseFloat(getComputedStyle(document.querySelector("#app-main-content")!).paddingBottom),
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
        if (route === "history") {
          await page.locator(".history-mobile-list").scrollIntoViewIfNeeded();
          await page.screenshot({ path: `test-results/mobile/${size.width}x${size.height}-history-list.png` });
        }
      }
    } finally {
      await context.close();
    }
  });
}

test("history snapshots use touch rows and a detail sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await installTauriBridge(page);
    await page.goto("/#/history");
    const row = page.getByTestId("history-mobile-row").first();
    await expect(row).toBeVisible();
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
  const page = await context.newPage();
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
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("history-mobile-row")).toHaveCount(2);
  } finally {
    await context.close();
  }
});

test("history pagination controls stay together at phone width", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
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
  const page = await context.newPage();
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
  const page = await context.newPage();
  try {
    await installTauriBridge(page);
    await page.goto("/#/comparison");
    await page.getByRole("button", { name: /base date/i }).click();
    const sheet = page.getByRole("dialog", { name: /base date/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: /2024/ }).first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test("comparison range choices respond to a horizontal swipe", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
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
  const page = await context.newPage();
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
  const page = await context.newPage();
  try {
    await installTauriBridge(page);
    await page.goto("/#/coins/BTC");
    await page.getByRole("combobox", { name: /symbol/i }).click();
    await expect(page.getByRole("dialog", { name: /symbol/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  } finally {
    await context.close();
  }
});

test("expanded overview rankings fit the phone card", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
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
  const page = await context.newPage();
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
  const page = await context.newPage();
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
  const page = await context.newPage();
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
  const page = await context.newPage();
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
  const page = await context.newPage();
  try {
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await expect(page.getByRole("button", { name: "Show More" })).toBeVisible();
    await expect(page.locator("#app-top-bar .mobile-compact-title")).toBeHidden();
    await page.evaluate(() => scrollTo(0, 180));
    await expect(page.locator("#app-top-bar .mobile-compact-title")).toBeVisible();
    await expect(page.locator("#app-top-bar")).toContainText("Overview");
  } finally {
    await context.close();
  }
});

test("back navigation returns to the previous page in the More tab", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await installTauriBridge(page);
    await page.goto("/#/more");
    await page.locator(".mobile-more-hub").getByRole("link", { name: "Settings" }).click();
    await page.getByRole("navigation", { name: /settings sections/i }).getByRole("link", { name: "Appearance" }).click();
    await page.locator(".mobile-route-heading").getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/#\/settings$/);
  } finally {
    await context.close();
  }
});

test("refresh source status rises from the bottom as a sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
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
