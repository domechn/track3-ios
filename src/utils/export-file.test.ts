import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ios: false,
  documentDir: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
}));

vi.mock("@/utils/platform", () => ({ isIOS: () => mocks.ios }));
vi.mock("@tauri-apps/api/path", () => ({ documentDir: mocks.documentDir }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ remove: mocks.remove, exists: mocks.exists }));

import { exportFile } from "./export-file";

beforeEach(() => {
  mocks.ios = false;
  mocks.documentDir.mockReset().mockResolvedValue("/app/Documents/");
  mocks.save.mockReset().mockResolvedValue("/chosen/report.csv");
  mocks.remove.mockReset().mockResolvedValue(undefined);
  mocks.exists.mockReset().mockResolvedValue(true);
});

describe("exportFile", () => {
  it("writes the iOS source before presenting the document picker", async () => {
    mocks.ios = true;
    let contents = "";
    mocks.save.mockImplementation(async () => {
      expect(contents).toBe("balances");
      return "/chosen/report.csv";
    });
    const result = await exportFile("report.csv", ["csv"], async (path) => {
      expect(path).toBe("/app/Documents/report.csv");
      contents = "balances";
    });
    expect(result).toBe(true);
  });

  it("removes the temporary iOS file when export is canceled", async () => {
    mocks.ios = true;
    mocks.save.mockResolvedValue(null);
    expect(await exportFile("report.csv", ["csv"], async () => {})).toBe(false);
    expect(mocks.remove).toHaveBeenCalledWith("/app/Documents/report.csv");
  });

  it("reports a failed iOS cleanup instead of leaving a canceled export behind", async () => {
    mocks.ios = true;
    mocks.save.mockResolvedValue(null);
    mocks.remove.mockRejectedValue(new Error("cleanup failed"));
    await expect(exportFile("report.csv", ["csv"], async () => {}))
      .rejects.toThrow("cleanup failed");
  });

  it("uses the chosen path on desktop", async () => {
    let writtenPath = "";
    expect(await exportFile("report.csv", ["csv"], async (path) => { writtenPath = path; })).toBe(true);
    expect(writtenPath).toBe("/chosen/report.csv");
    expect(mocks.documentDir).not.toHaveBeenCalled();
  });
});
