import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ios: true }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@/utils/platform", () => ({ isIOS: () => mocks.ios }));

import { isAppContentRendered, markIOSReady } from "./ios-ready";

beforeEach(() => {
  document.body.innerHTML = "";
  mocks.ios = true;
  mocks.invoke.mockReset().mockResolvedValue(undefined);
});

it("waits for real page content instead of accepting a loading overlay", () => {
  document.body.innerHTML = '<main id="app-main-content"><div aria-busy="true"><h1>Overview</h1></div></main>';
  expect(isAppContentRendered()).toBe(false);
  document.querySelector("[aria-busy]")?.setAttribute("aria-busy", "false");
  expect(isAppContentRendered()).toBe(true);
});

it("marks iOS ready after the rendered app opens its bridge", async () => {
  document.body.innerHTML = '<main id="app-main-content"><div aria-busy="false"><h1>Overview</h1></div></main>';
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => callback(0));
  try {
    await markIOSReady();
    expect(mocks.invoke).toHaveBeenCalledWith("mark_frontend_ready");
  } finally {
    vi.unstubAllGlobals();
  }
});
