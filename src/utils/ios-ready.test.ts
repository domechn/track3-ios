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

it("accepts the overview heading while its data is still loading", () => {
  document.body.innerHTML = '<main id="app-main-content"><div aria-busy="true"><h1>Overview</h1></div></main>';
  expect(isAppContentRendered()).toBe(true);
});

it("marks iOS ready after the rendered app opens its bridge", async () => {
  document.body.innerHTML = '<main id="app-main-content"><div aria-busy="false"><h1>Overview</h1></div></main>';
  vi.stubEnv("VITE_TRACK3_IOS_READY_PROBE", "1");
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => callback(0));
  try {
    await markIOSReady();
    expect(mocks.invoke).toHaveBeenCalledWith("mark_frontend_ready");
  } finally {
    vi.unstubAllGlobals();
  }
});

it("does not invoke the CI probe in ordinary builds", async () => {
  document.body.innerHTML = '<main id="app-main-content"><h1>Overview</h1></main>';
  vi.stubEnv("VITE_TRACK3_IOS_READY_PROBE", "");
  try {
    await markIOSReady();
    expect(mocks.invoke).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
