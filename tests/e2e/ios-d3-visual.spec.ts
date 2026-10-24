import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { installTauriBridge } from "./tauri-bridge";

test.use({
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

const phones = [
  { name: "se", width: 375, height: 667 },
  { name: "14", width: 390, height: 844 },
];
const settings = [
  ["settings", "/settings", "Settings"],
  ["sources", "/settings/configuration?section=sources", "Data sources"],
  ["currency", "/settings/configuration?section=currency", "Currency"],
  ["appearance", "/settings/appearance?section=theme", "Appearance"],
  ["language", "/settings/appearance?section=language", "Language"],
  ["blacklist", "/settings/data?section=blacklist", "Blacklist"],
  ["security", "/settings/data?section=security", "Security"],
  ["backup", "/settings/data?section=backup", "Backup"],
  ["pro", "/settings/systemInfo?section=pro", "Pro and license"],
  ["about", "/settings/systemInfo?section=about", "About"],
  ["assistant-settings", "/settings/assistant", "AI assistant"],
  ["sync-settings", "/settings/sync", "Backup and sync"],
] as const;

async function capture(page: Page, phone: string, theme: string, name: string) {
  await expect(page.locator("#app-main-content")).not.toContainText("Loading page");
  await expect(page.locator("#app-main-content [aria-busy='true']")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const image = await page.screenshot({ path: `test-results/mobile/d3-${phone}-${theme}-${name}.png` });
  const width = page.viewportSize()!.width;
  expect(image.readUInt32BE(16)).toBe(width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

for (const phone of phones) for (const theme of ["light", "dark"] as const) {
  test(`D3 screens are reachable and captured on iPhone ${phone.name} in ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(() => localStorage.setItem("track3-ui-theme", "system"));
    await installTauriBridge(page, undefined, false, true, false, false, true, false, false, true, true);
    mkdirSync("test-results/mobile", { recursive: true });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const [name, route, title] of settings) {
      await page.goto(`/#${route}`);
      await expect(page.locator("#app-main-content h1")).toHaveText(title);
      await capture(page, phone.name, theme, name);
      if (name === "backup") {
        const folderActions = page.locator(".ios-d3-backup-folder-actions");
        await folderActions.evaluate((element) => element.scrollIntoView({ block: "center" }));
        const card = await folderActions.locator("xpath=ancestor::*[contains(@class, 'ios-d3-auto-backup-setting')]").boundingBox();
        for (const button of await folderActions.getByRole("button").all()) {
          const bounds = await button.boundingBox();
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(card!.x + card!.width);
        }
        await capture(page, phone.name, theme, "backup-folder");
      }
    }
    await page.goto("/#/settings/configuration?section=sources");
    await expect(page.getByRole("button", { name: "More actions for Main exchange" })).toBeVisible();
    await page.getByRole("button", { name: "More actions for Main exchange" }).click();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-source-actions.png` });
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Add exchange" }).click();
    await expect(page.getByRole("dialog", { name: "Edit data source" })).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-source-provider.png` });
    await page.getByRole("button", { name: "Binance" }).click();
    await expect(page.getByRole("textbox", { name: "API key" })).toHaveAttribute("placeholder", "Required");
    await expect(page.locator(".ios-d3-editor-intro")).toContainText("Binance");
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-source-credentials.png` });
    await page.getByRole("dialog", { name: "Edit data source" }).getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Add symbol" }).click();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-custom-asset-editor.png` });
    await page.getByRole("dialog", { name: "Edit custom asset" }).getByRole("button", { name: "Cancel" }).click();

    await page.goto("/#/more");
    await capture(page, phone.name, theme, "more");
    await page.goto("/#/goals");
    await page.getByRole("button", { name: "Add alert" }).click();
    const saveRule = await page.getByRole("dialog", { name: "Add alert" }).getByRole("button", { name: "Save rule" }).boundingBox();
    const goalNav = await page.locator(".ios-d3-goal-editor-nav").boundingBox();
    expect(saveRule!.y + saveRule!.height).toBeLessThanOrEqual(goalNav!.y + goalNav!.height);
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-goal-editor.png` });
    await page.getByRole("dialog", { name: "Add alert" }).getByRole("spinbutton", { name: "Threshold" }).fill("90000");
    await page.getByRole("dialog", { name: "Add alert" }).getByRole("button", { name: "Save rule" }).click();
    await expect(page.getByRole("dialog", { name: "Add alert" })).not.toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, phone.name, theme, "goals");
    for (const chip of await page.locator(".ios-d3-goals [data-ai-setup-suggestion]").all()) {
      const bounds = await chip.boundingBox();
      const card = await chip.locator("xpath=ancestor::*[@data-ai-setup-card]").boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(card!.x + card!.width);
    }
    await expect(page.getByRole("progressbar", { name: /Portfolio value goal/i })).toBeVisible();
    await page.locator(".ios-d3-goal-rule").first().evaluate((element) => element.scrollIntoView({ block: "start" }));
    const goalProgress = await page.locator(".ios-d3-goal-rule").first().getByRole("progressbar").boundingBox();
    const goalTabBar = await page.locator(".mobile-tab-bar").boundingBox();
    const goalTopBar = await page.locator("#app-top-bar").boundingBox();
    expect(goalProgress!.y).toBeGreaterThanOrEqual(goalTopBar!.y + goalTopBar!.height);
    expect(goalProgress!.y + goalProgress!.height).toBeLessThanOrEqual(goalTabBar!.y);
    await capture(page, phone.name, theme, "goal-progress");

    await page.goto("/#/rebalance");
    await expect(page.getByRole("heading", { level: 1, name: "Rebalance" })).toBeVisible();
    await capture(page, phone.name, theme, "rebalance");
    for (const chip of await page.locator(".ios-d3-rebalance [data-ai-setup-suggestion]").all()) {
      const bounds = await chip.boundingBox();
      const card = await chip.locator("xpath=ancestor::*[@data-ai-setup-card]").boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(card!.x + card!.width);
    }
    await page.getByText("Manual setup", { exact: true }).click();
    await page.locator(".ios-d3-target").first().scrollIntoViewIfNeeded();
    await capture(page, phone.name, theme, "rebalance-targets");
    await page.locator(".ios-d3-trade").first().scrollIntoViewIfNeeded();
    const tradeSymbol = page.locator(".ios-d3-trade .ios-d3-trade-symbol").first();
    const symbolBounds = await tradeSymbol.boundingBox();
    const tradeBounds = await page.locator(".ios-d3-trade").first().boundingBox();
    expect(symbolBounds!.x + symbolBounds!.width).toBeLessThanOrEqual(tradeBounds!.x + tradeBounds!.width);
    await capture(page, phone.name, theme, "rebalance-trades");
    await page.goto("/#/assistant");
    await expect(page.getByRole("textbox", { name: "Ask the assistant..." })).toBeVisible();
    await expect(page.locator(".ios-d3-chat-header")).toContainText("Assistant");
    await capture(page, phone.name, theme, "assistant-empty");
    const chatHeader = await page.locator(".ios-d3-chat-header").boundingBox();
    const firstSuggestion = await page.getByTestId("chat-example-summary").boundingBox();
    const composer = await page.locator(".ios-d3-chat-composer").boundingBox();
    expect(chatHeader!.height).toBeLessThanOrEqual(56);
    expect(firstSuggestion!.y + firstSuggestion!.height).toBeLessThanOrEqual(composer!.y);
    await page.getByRole("textbox", { name: "Ask the assistant..." }).fill("Say hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator('.ios-d3-chat-bubble[data-streaming="true"] .markdown-content')).toBeVisible({ timeout: 1500 });
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-assistant-streaming.png` });
    await expect(page.getByText("Hello from SSE")).toBeVisible();
    const reply = await page.getByText("Hello from SSE").boundingBox();
    const composerAfterReply = await page.locator(".ios-d3-chat-composer").boundingBox();
    const tabBar = await page.locator(".mobile-tab-bar").boundingBox();
    expect(reply).not.toBeNull();
    expect(composerAfterReply).not.toBeNull();
    expect(tabBar).not.toBeNull();
    expect(reply!.y + reply!.height).toBeLessThanOrEqual(composerAfterReply!.y);
    expect(composerAfterReply!.y + composerAfterReply!.height).toBeLessThanOrEqual(tabBar!.y);
    await expect(page.locator('.ios-d3-chat-bubble[data-streaming="true"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    const chatHeaderAfterReply = await page.locator(".ios-d3-chat-header").boundingBox();
    expect(chatHeaderAfterReply!.height).toBeLessThanOrEqual(56);
    const topBar = await page.locator("#app-top-bar").boundingBox();
    expect(chatHeaderAfterReply!.y).toBeLessThan(topBar!.y + topBar!.height);
    await capture(page, phone.name, theme, "assistant-chat");
    await page.getByRole("textbox", { name: "Ask the assistant..." }).fill("Show my tool activity");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Tool activity")).toBeVisible();
    await expect(page.locator(".ios-d3-tool-activity summary")).toContainText(/2 tools · (running|done)/);
    await expect(page.locator(".ios-d3-tool-chevron")).toBeVisible();
    await capture(page, phone.name, theme, "assistant-tools");

    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("alertdialog", { name: "Source status" })).toBeVisible();
    await expect(page.locator("[data-source-status-row]").first()).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-refresh.png` });
    await expect(page.locator(".ios-d3-refresh-sheet [role='progressbar']")).toHaveCount(0, { timeout: 90_000 });
    if (!await page.getByRole("alertdialog", { name: "Source status" }).isVisible()) {
      await page.getByRole("button", { name: "Source status" }).click();
    }
    await expect(page.locator("[data-source-status-row]").first()).toBeVisible();
    await expect(page.locator(".ios-d3-toast-viewport")).toHaveCount(1);
    await expect(page.locator(".ios-d3-toast-viewport")).toBeHidden();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-refresh-results.png` });
    expect(errors).toEqual([]);
  });

  test(`D3 first launch and startup lock are captured on iPhone ${phone.name} in ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(() => localStorage.setItem("track3-ui-theme", "system"));
    await installTauriBridge(page, undefined, false, false, true);
    mkdirSync("test-results/mobile", { recursive: true });
    await page.goto("/#/overview");
    await expect(page.getByRole("button", { name: "Add your first source" })).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-first-launch.png` });
    await page.getByRole("button", { name: "Add your first source" }).click();
    await expect(page.getByRole("list", { name: "Getting started" })).toBeVisible();
    await capture(page, phone.name, theme, "onboarding");
    await page.getByRole("button", { name: "Add source" }).click();
    await expect(page.getByRole("button", { name: "Add exchange" })).toBeVisible();
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-source-kind-picker.png` });
  });

  test(`D3 protected startup is captured on iPhone ${phone.name} in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(() => localStorage.setItem("track3-ui-theme", "system"));
    await installTauriBridge(page, undefined, false, false, false, false, false, false, true);
    mkdirSync("test-results/mobile", { recursive: true });
    await page.goto("/#/overview");
    await expect(page.getByRole("alert")).toContainText("Track3 is locked");
    await page.screenshot({ path: `test-results/mobile/d3-${phone.name}-${theme}-startup-lock.png` });
  });
}
