import { describe, expect, it } from "vitest";
import { detectPlatform, keyboardHeight } from "./platform";

describe("iOS platform state", () => {
  it("recognizes iPhone and touch iPad without treating desktop Safari as iOS", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", "iPhone", 0, 390).isIOS).toBe(true);
    expect(detectPlatform("Mozilla/5.0 (Macintosh)", "MacIntel", 5, 1024).isIOS).toBe(true);
    expect(detectPlatform("Mozilla/5.0 (Macintosh)", "MacIntel", 0, 1024).isIOS).toBe(false);
  });

  it("reports visible keyboard overlap without negative heights", () => {
    expect(keyboardHeight(800, 500, 0)).toBe(300);
    expect(keyboardHeight(800, 810, 0)).toBe(0);
  });
});
