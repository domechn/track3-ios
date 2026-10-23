import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileSources } from "./mobile-sources";

const props = {
  exchanges: [{ type: "binance", apiKey: "private-key-1234", secret: "secret", active: true }],
  wallets: [],
  brokers: [],
  exchangeOptions: [{ value: "binance", label: "Binance" }, { value: "okex", label: "OKX" }],
  walletOptions: [{ value: "btc", label: "BTC" }],
  brokerOptions: [{ value: "ibkr", label: "IBKR" }],
  onSaveExchange: vi.fn(async () => {}),
  onSaveWallet: vi.fn(async () => {}),
  onSaveBroker: vi.fn(async () => {}),
  onRemoveExchange: vi.fn(),
  onRemoveWallet: vi.fn(),
  onRemoveBroker: vi.fn(),
  onToggleExchange: vi.fn(),
  onToggleWallet: vi.fn(),
  onToggleBroker: vi.fn(),
};

describe("mobile data sources", () => {
  it("keeps Pro balance preview available from a saved source", () => {
    const preview = vi.fn();
    render(<MobileSources {...props} isPro onQuickLookExchange={preview} />);
    fireEvent.click(screen.getByRole("button", { name: "Quick look Binance" }));
    expect(preview).toHaveBeenCalledWith(props.exchanges[0]);
  });

  it("masks saved credentials and validates provider fields before saving", () => {
    render(<MobileSources {...props} />);
    expect(screen.queryByText("private-key-1234")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add exchange" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/api key/i);
    expect(screen.getByRole("textbox", { name: "Api Key" })).toHaveAttribute("aria-invalid", "true");
    expect(props.onSaveExchange).not.toHaveBeenCalled();
  });

  it("opens a wallet form with an address field reachable on a phone", () => {
    render(<MobileSources {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Add wallet" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("textbox", { name: "Address" })).toHaveAttribute("autocapitalize", "off");
    expect(screen.getByRole("textbox", { name: "Address" })).toHaveAttribute("autocomplete", "off");
  });
});
