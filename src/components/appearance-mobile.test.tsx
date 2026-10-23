import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Appearance from "./appearance";
import { isIOS } from "@/utils/platform";

vi.mock("@/utils/platform", () => ({ isIOS: vi.fn(() => true) }));
vi.mock("@/middlelayers/configuration", () => ({
  getQuoteColor: vi.fn().mockResolvedValue("green-up-red-down"),
  saveQuoteColor: vi.fn(),
  saveTheme: vi.fn(),
}));
vi.mock("@/utils/app", () => ({ reloadApp: vi.fn() }));

describe("iPhone appearance settings", () => {
  it("keeps language selection separate from theme and offers system theme", () => {
    window.location.hash = "#/settings/appearance?section=theme";
    const view = render(<Appearance />);
    expect(screen.getByText("Follow system")).toBeInTheDocument();
    expect(screen.queryByText("Language")).not.toBeInTheDocument();
    view.unmount();
    window.location.hash = "#/settings/appearance?section=language";
    render(<Appearance />);
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.queryByText("Follow system")).not.toBeInTheDocument();
    vi.mocked(isIOS).mockReturnValue(false);
    window.location.hash = "";
  });
});
