import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BottomSheet, MobilePage } from "./index";

it("keeps page focus inside, closes on Escape, and restores scrolling", () => {
  const dismiss = vi.fn();
  const before = document.body.style.overflow;
  const view = render(<><button>Outside</button><MobilePage title="Edit" onDismiss={dismiss}>
    <button>First</button><button>Last</button>
  </MobilePage></>);
  expect(document.body.style.overflow).toBe("hidden");
  expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(dismiss).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(document.body.style.overflow).toBe(before);
});

it("dismisses a sheet when its backdrop is tapped", () => {
  const dismiss = vi.fn();
  render(<BottomSheet title="Delete" onDismiss={dismiss}><button>Cancel</button></BottomSheet>);
  fireEvent.click(screen.getByRole("alertdialog"));
  expect(dismiss).toHaveBeenCalledTimes(1);
});
