import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { installTauriBridge } from "./tauri-bridge";

test.use({
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  reducedMotion: "reduce",
});

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

const phones = [
  { name: "se", width: 375, height: 667 },
  { name: "14", width: 390, height: 844 },
  { name: "pro-max", width: 430, height: 932 },
];

for (const phone of phones) {
  test(`portfolio routes fit iPhone ${phone.name} with native controls`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page);
    mkdirSync("test-results/mobile", { recursive: true });
    for (const [route, title] of [
      ["overview", "Overview"],
      ["history", "History"],
      ["summary", "Summary"],
      ["wallets", "Wallets"],
      ["comparison", "Comparison"],
      ["cost-basis", "Cost basis"],
      ["more", "More"],
    ]) {
      await page.goto(`/#/${route}`);
      await expect(page.locator("#app-main-content")).toBeVisible();
      if (route === "more") {
        await expect(page.locator(".mobile-more-hub")).toBeVisible();
        await expect(page.getByRole("link", { name: "Rebalance" })).toBeVisible();
      } else {
        await expect(page.locator("#app-main-content h1")).toHaveText(title);
      }
      await expect(page.locator("#app-main-content")).not.toContainText("Loading page");
      await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
      if (route === "summary") {
        await expect(page.getByText("Profit Metrics", { exact: true })).toBeAttached();
        await expect(page.getByText("Profit Summary", { exact: true })).toBeAttached();
      }
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-${route}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
      const tab = page.locator(".mobile-tab-bar");
      const tabBox = (await tab.boundingBox())!;
      expect(tabBox.y + tabBox.height).toBeLessThanOrEqual(phone.height + 1);
      for (const link of await tab.locator("a").all()) {
        const box = (await link.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
      for (const control of await page.locator(
        "#app-top-bar button:visible, .mobile-more-hub a:visible, .mobile-route-heading button:visible",
      ).all()) {
        const box = (await control.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
      const inset = await page.locator("#app-main-content").evaluate((main) => {
        const before = parseFloat(getComputedStyle(main).paddingBottom);
        (main as HTMLElement).style.setProperty("--mobile-safe-bottom", "31px");
        const after = parseFloat(getComputedStyle(main).paddingBottom);
        (main as HTMLElement).style.removeProperty("--mobile-safe-bottom");
        return after - before;
      });
      expect(inset).toBe(31);
      if (route === "summary") {
        await page.getByText("Profit Summary", { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-profit.png` });
      }
    }
  });

  test(`rebalance disclosures have 44px targets on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page, undefined, false, true);
    await page.goto("/#/rebalance");
    await expect(page.getByText("Manual setup", { exact: true })).toBeVisible();
    for (const title of ["Manual setup", "Details"]) {
      const summary = page.locator("summary").filter({ hasText: title });
      if (title === "Details") await summary.scrollIntoViewIfNeeded();
      const box = (await summary.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test(`first launch adds a holding and refreshes on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page, undefined, false, false, true);
    await page.goto("/#/overview");
    await expect(page.getByText("There is not enough data")).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-first-launch.png` });
    await page.getByRole("button", { name: "Go to settings" }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Data sources" }).click();
    await page.getByRole("button", { name: "Add Symbol" }).click();
    const form = page.getByRole("dialog", { name: "Edit custom asset" });
    await form.getByRole("textbox", { name: "Symbol" }).fill("ETH");
    await form.getByRole("textbox", { name: "Amount" }).fill("2");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("button", { name: "Edit ETH" })).toBeVisible();
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "Overview" }).click();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("alertdialog", { name: "Source status" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
  });

  test(`an exchange and wallet can be added on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page);
    await page.goto("/#/more");
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("navigation", { name: "Settings sections" })
      .getByRole("link", { name: "Data sources" }).click();

    await page.getByRole("button", { name: "Add wallet" }).click();
    const wallet = page.getByRole("dialog", { name: "Edit data source" });
    await wallet.getByRole("button", { name: "Continue" }).click();
    await wallet.getByRole("textbox", { name: "Alias" }).fill("Long-term BTC");
    await wallet.getByRole("textbox", { name: "Address" }).fill("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    await wallet.getByRole("button", { name: "Save changes" }).click();
    await expect(wallet).not.toBeVisible();
    await expect(page.getByRole("region", { name: "Wallet" }).getByRole("button", { name: /^Long-term BTC / })).toBeVisible();

    await page.getByRole("button", { name: "Add exchange" }).click();
    const exchange = page.getByRole("dialog", { name: "Edit data source" });
    await exchange.getByRole("button", { name: "Continue" }).click();
    await exchange.getByRole("textbox", { name: "Alias" }).fill("Portfolio Binance");
    await exchange.getByRole("textbox", { name: "Api Key" }).fill("e2e-api-key");
    await exchange.getByRole("textbox", { name: "Api Secret" }).fill("e2e-api-secret");
    await exchange.getByRole("button", { name: "Save changes" }).click();
    await expect(exchange).not.toBeVisible();
    await expect(page.getByRole("region", { name: "Exchanges" }).getByRole("button", { name: /^Portfolio Binance / })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Wallet" }).getByRole("button", { name: /^Long-term BTC / })).toBeVisible();
    await expect(page.getByRole("region", { name: "Exchanges" }).getByRole("button", { name: /^Portfolio Binance / })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
    await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-added-sources.png` });
  });

  test(`Files export restores on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    const bridge = await installTauriBridge(page);
    await page.goto("/#/settings/data?section=backup");
    await page.getByRole("button", { name: "Share JSON" }).click();
    await expect.poll(bridge.shares).toBe(1);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(page.getByText("Export data successfully", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const confirm = page.getByRole("alertdialog", { name: "Restore data?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Restore" }).click();
    const conflicts = page.getByRole("dialog", { name: "Conflicts Found" });
    await expect(conflicts).toBeVisible();
    await conflicts.getByRole("button", { name: "Ignore" }).click();
    await expect(page.getByText("Import data successfully", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
  });

  test(`a goal, rebalance targets, and assistant reply work from More on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page, undefined, false, true);
    await page.goto("/#/more");
    await page.getByRole("link", { name: "Goals & Alerts" }).click();
    await page.getByRole("button", { name: "Add alert" }).click();
    const goal = page.getByRole("dialog", { name: "Add alert" });
    await goal.getByRole("spinbutton", { name: "Threshold" }).fill("50000");
    await goal.getByRole("button", { name: "Save rule" }).click();
    await expect(goal).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-created-goal.png` });
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "More" }).click();
    await page.getByRole("link", { name: "Rebalance" }).click();
    await page.getByText("Manual setup", { exact: true }).click();
    await page.getByRole("button", { name: "Save targets" }).click();
    await expect(page.getByText("Targets saved.")).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-rebalance.png` });
    await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "More" }).click();
    await page.getByRole("link", { name: "Assistant" }).click();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(1);
    await page.getByRole("textbox", { name: "Ask the assistant..." }).fill("Say hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Hello from SSE")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    const titleRow = (await page.getByTestId("sidebar-toggle").locator("..").boundingBox())!;
    const settings = (await page.getByTestId("chat-open-settings").boundingBox())!;
    expect(settings.y).toBeGreaterThanOrEqual(titleRow.y + titleRow.height);
    await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-assistant.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
  });

  test(`language and theme choices persist on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page);
    await page.goto("/#/settings/appearance?section=language");
    await page.getByRole("radio", { name: "中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.goto("/#/settings/appearance?section=theme");
    await page.getByText("深色", { exact: true }).click();
    await page.getByRole("button", { name: "应用修改" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "外观" })).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/ios-${phone.name}-dark-theme.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
  });

  test(`settings checkboxes and radios have labeled tap areas on iPhone ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await installTauriBridge(page);
    for (const [route, ids] of [
      ["/settings/configuration?section=currency", ["groupUSD", "hideInactive"]],
      ["/settings/appearance?section=theme", ["system", "light", "dark", "green-up-red-down", "red-up-green-down"]],
      ["/settings/appearance?section=language", ["language-en", "language-zh"]],
      ["/settings/data?section=backup", ["exportConfigurationCheckbox", "exportDataCheckbox"]],
    ] as const) {
      await page.goto(`/#${route}`);
      for (const id of ids) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
        const box = (await label.boundingBox())!;
        expect(box.width, `${route} ${id} width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${route} ${id} height`).toBeGreaterThanOrEqual(44);
      }
      const idToTap = route.includes("currency") ? "groupUSD"
        : route.includes("theme") ? "dark"
          : route.includes("language") ? "language-zh" : "exportConfigurationCheckbox";
      const control = page.locator(`[id="${idToTap}"]`);
      const before = await control.getAttribute("data-state");
      await page.locator(`label[for="${idToTap}"]`).click();
      await expect(control).not.toHaveAttribute("data-state", before ?? "");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone.width);
    }
  });
}
