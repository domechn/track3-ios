import { expect, test } from "@playwright/test";
import { installTauriBridge } from "./tauri-bridge";

test.use({
  isMobile: true, hasTouch: true, reducedMotion: "reduce",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

test("rich dark Analytics drawdown has readable loss text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("track3-ui-theme", "system"));
  await installTauriBridge(page, undefined, false, false, false, false, true);
  await page.goto("/#/summary");
  await expect(page.locator(".d2-summary")).toHaveAttribute("aria-busy", "false");
  const drawdown = page.locator(".ath-card").getByText("% from ATH").locator("..").locator("div").last();
  await expect(drawdown).toContainText("-");
  const contrast = await drawdown.evaluate((node) => {
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (color: string) => {
      const [r, g, b] = rgb(color).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const foreground = luminance(getComputedStyle(node).color);
    const background = luminance(getComputedStyle(node.closest(".ath-card")!).backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test("phone titles share one page inset and performance metrics share one layout", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await installTauriBridge(page, undefined, false, false, false, false, true);
  for (const [route, label] of [
    ["/overview", "Overview"], ["/history", "History"], ["/summary", "Analytics"],
    ["/goals", "Goals & Alerts"], ["/settings", "Settings"],
    ["/settings/configuration?section=sources", "Data sources"],
  ]) {
    await page.goto(`/#${route}`);
    const title = page.locator("#app-main-content h1.ios-large-title:visible").first();
    await expect(title).toHaveText(label);
    await expect.poll(() => title.evaluate((node) => node.getBoundingClientRect().x)).toBe(16);
  }
  await page.goto("/#/overview");
  const metrics = page.locator(".overview-pnl-metric");
  await expect(metrics).toHaveCount(3);
  const layouts = await metrics.evaluateAll((nodes) => nodes.map((node) => ({
    display: getComputedStyle(node).display,
    textAlign: getComputedStyle(node).textAlign,
  })));
  expect(layouts[2]).toEqual(layouts[0]);
  const containment = await metrics.evaluateAll((nodes) => nodes.map((node) => ({
    cell: node.getBoundingClientRect().width,
    text: Math.max(...[...node.children].map((child) => child.getBoundingClientRect().width)),
  })));
  expect(containment.every(({ cell, text }) => text <= cell + 1), JSON.stringify(containment)).toBe(true);
});

test("the three 390px performance metrics align their labels and values", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installTauriBridge(page, undefined, false, false, false, false, true);
  await page.goto("/#/overview");
  await expect(page.locator(".overview-pnl-metric")).toHaveCount(3);
  for (const selector of [".overview-pnl-metric > :first-child", ".overview-pnl-metric-value"]) {
    const tops = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  }
});

test("phone Goals and Assistant cards use quiet headings", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installTauriBridge(page, undefined, false, false, false, false, true);
  await page.goto("/#/goals");
  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
  const heading = page.getByRole("heading", { name: "Rules" });
  const style = await heading.evaluate((node) => {
    const computed = getComputedStyle(node);
    const sample = document.createElement("span");
    sample.className = "text-muted-foreground";
    document.body.append(sample);
    const muted = getComputedStyle(sample).color;
    sample.remove();
    return { size: computed.fontSize, weight: computed.fontWeight, color: computed.color, muted };
  });
  expect(style.size).toBe("13px");
  expect(style.weight).toBe("500");
  expect(style.color).toBe(style.muted);
  const setup = page.locator("[data-ai-setup-card] h2");
  await expect(setup).toBeVisible();
  expect(await setup.evaluate((node) => getComputedStyle(node).fontSize)).toBe("13px");
  await page.goto("/#/assistant");
  const insights = page.locator(".assistant-insights-card h3");
  await expect(insights).toBeVisible();
  expect(await insights.evaluate((node) => getComputedStyle(node).fontSize)).toBe("13px");
});

test("desktop source status rows retain a horizontal layout", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await installTauriBridge(page, undefined, false, false, false, false, true);
    await page.goto("/#/overview");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.locator(".ios-d3-refresh-sheet [role='progressbar']")).toHaveCount(0);
    if (!await page.getByRole("alertdialog", { name: "Source status" }).isVisible()) {
      await page.getByRole("button", { name: "Source status" }).click();
    }
    const row = page.locator("[data-source-status-row]").first();
    await expect(row).toBeVisible();
    expect(await row.evaluate((node) => getComputedStyle(node).display)).toBe("flex");
  } finally {
    await context.close();
  }
});
