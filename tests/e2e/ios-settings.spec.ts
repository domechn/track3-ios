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
