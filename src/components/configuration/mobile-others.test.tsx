import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MobileOthers } from "./mobile-others";

it("edits custom holdings on a phone and offers their source attachment", () => {
  const save = vi.fn();
  const attach = vi.fn();
  render(<MobileOthers others={[{ symbol: "GOLD", amount: 2 }]} onSave={save} onRemove={vi.fn()} onAttach={attach} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit GOLD" }));
  expect(screen.getByRole("dialog", { name: "Edit custom asset" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(save).toHaveBeenCalledWith(0, { symbol: "GOLD", amount: 3, alias: "" });
  fireEvent.click(screen.getByRole("button", { name: "Attach to GOLD" }));
  expect(attach).toHaveBeenCalledWith(0);
});
