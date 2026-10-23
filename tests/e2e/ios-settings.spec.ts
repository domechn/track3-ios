import { expect, test } from "@playwright/test";
import { installTauriBridge } from "./tauri-bridge";

test.use({
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

for (const width of [375, 390, 430]) {
  test(`iPhone settings and source forms stay within ${width}px`, async ({ page }) => {
    page.on("pageerror", (error) => console.error("iPhone page error:", error.message));
    await page.setViewportSize({ width, height: 812 });
    await installTauriBridge(page);
    await page.goto("/#/settings");
    await expect(page.getByRole("link", { name: "Data sources" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole("link", { name: "Data sources" }).click();
    await expect(page.getByRole("button", { name: "Add exchange" })).toBeVisible();
    await page.getByRole("button", { name: "Add exchange" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("textbox", { name: "Api Key" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.goto("/#/settings/data?section=backup");
    await expect(page.getByRole("button", { name: "Share JSON" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto("/#/settings/appearance?section=language");
    await expect(page.getByRole("heading", { level: 1, name: "Language" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`remaining iPhone settings pages stay reachable within ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await installTauriBridge(page);
    for (const [path, title, content] of [
      ["/settings/configuration?section=currency", "Currency", "Base Currency"],
      ["/settings/appearance?section=theme", "Appearance", "Follow system"],
      ["/settings/data?section=blacklist", "Blacklist", "Token Blacklist"],
      ["/settings/systemInfo?section=pro", "Pro and license", "Pro Status"],
      ["/settings/assistant", "AI assistant", "Endpoint"],
      ["/settings/data?section=security", "Security", "App lock"],
      ["/settings/sync", "Backup and sync", "S3 endpoint"],
      ["/settings/systemInfo?section=about", "About", "App Version"],
    ]) {
      await page.goto(`/#${path}`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByText(content, { exact: true }).last()).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });

  test(`assistant, alert editor and rebalance fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await installTauriBridge(page);
    await page.goto("/#/assistant");
    await expect(page.getByRole("textbox", { name: "Ask the assistant..." })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto("/#/goals");
    await expect(page.getByRole("heading", { level: 1, name: "Goals & Alerts" })).toBeVisible();
    await page.getByText("Add alert", { exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Add alert" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto("/#/rebalance");
    await expect(page.getByRole("heading", { level: 1, name: "Rebalance" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`refresh progress sheet fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await installTauriBridge(page);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByRole("alertdialog", { name: "Source status" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test("custom asset source picker opens from the bottom of the iPhone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 812 });
  await installTauriBridge(page);
  await page.goto("/#/settings/configuration?section=sources");
  await page.getByRole("button", { name: "Attach to BTC" }).click();
  const picker = page.getByRole("dialog", { name: "Attach to" });
  await expect(picker).toBeVisible();
  const box = await picker.boundingBox();
  expect(box!.y).toBeGreaterThan(400);
});

test("rebalance suggestions use readable cards at 375px when a profile has data", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await installTauriBridge(page, undefined, false, true);
  await page.goto("/#/rebalance");
  await page.getByText("Details", { exact: true }).click();
  const cards = page.getByRole("list", { name: "Suggested trades" });
  await expect(cards).toBeVisible();
  await expect(page.getByRole("table", { name: "Suggested trades" })).toHaveCount(0);
  const btc = cards.getByRole("listitem", { name: "BTC" });
  await expect(btc).toContainText("Current");
  await expect(btc).toContainText("Target");
  await expect(btc).toContainText("Sell");
  await expect(btc).toContainText("Value");
  await expect(btc).toContainText("Quantity");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
