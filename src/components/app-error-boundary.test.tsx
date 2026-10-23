import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import AppErrorBoundary from "./app-error-boundary";

function BrokenPage(): React.JSX.Element {
  throw new Error("page render failed");
}

it("shows a localized recovery screen when the app crashes during render", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(
      <I18nProvider>
        <AppErrorBoundary>
          <BrokenPage />
        </AppErrorBoundary>
      </I18nProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Track3 could not open this page.");
  } finally {
    vi.restoreAllMocks();
  }
});
