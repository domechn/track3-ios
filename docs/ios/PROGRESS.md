# iOS port progress

## S1 foundation

- Last pushed run `39932803896` failed in both jobs. The web job could not
  install `libwebkit2gtk-4.0-dev` on Ubuntu 24.04. The iOS job built and
  passed both Rust target checks, then showed a blank white simulator
  screenshot and timed out waiting for the frontend readiness marker. WebKit
  loaded the page assets, but the available log did not show JavaScript
  errors. The run uploaded no artifacts.
- This round removes the obsolete 4.0 package from the foundation workflow,
  lets the readiness probe recognize a fresh install's empty portfolio, adds
  an app error screen and startup JavaScript error capture, and checks the
  initial simulator screenshot. The workflow now attempts to upload the
  simulator `.app`, unsigned `.ipa`, screenshots, and logs on every run. The
  repository currently has zero stored artifacts; account artifact quota
  may still prevent uploads.
- A local production build reproduced the blank page: a circular Vite manual
  chunk made `vendor-charts` read React before initialization. Removing that
  chunk rule removed the circular import. At an iPhone viewport the rebuilt
  bundle has no JavaScript page error; the production Playwright portfolio
  smoke test passes with its Tauri bridge fixture.
- Local `corepack yarn tsc --noEmit` and the probe-enabled frontend build
  passed. `corepack yarn vitest run` passed (1,723 tests in 203 files).

The S1 exit condition is **not yet met**. The driver must commit and push
this worktree, then provide the macOS CI result. A green iOS job and a
rendered simulator screenshot artifact are still required. Physical device
and signed build checks remain pending.

## S2 mobile shell and data screens

- Added the phone shell with four bottom tabs, per-tab back navigation,
  including stock asset query parameters, collapsing titles, a compact
  portfolio total, safe-area spacing, pull to
  refresh through the existing refresh button, and a floating source-status
  sheet. Desktop routing remains available.
- Added reusable touch components in `src/components/mobile/`; their usage
  contract is in `docs/ios/MOBILE-UI.md`. History, comparison, cost basis,
  coin transactions, wallet analytics, and attribution now show phone rows,
  sheets, or date inputs instead of wide tables and popovers. Overview
  rankings and shared dialog styles fit phone widths. Comparison ranges
  support horizontal swipes; finance charts accept touch inspection.
- Local checks passed: `corepack yarn tsc --noEmit`; Vitest (205 files,
  1,736 tests); Playwright mobile suite (18 tests); Rust pure tests (60
  tests). Playwright saved 28 route screenshots in `test-results/mobile/`
  at 320, 375, 390, and 430 CSS pixels. Each route check waits for content
  to load, then asserts no document overflow or clipped visible leaf text
  and checks bottom safe-area clearance. The screenshot set has the expected
  dimensions and nonuniform pixel content.
- Still pending: macOS GitHub Actions iOS compilation and simulator review,
  physical-device interaction checks, and a native haptic bridge. The
  shared haptic hook uses vibration where a WebView supports it; WKWebView
  needs a native bridge for physical feedback. S3-owned screens will need
  to adopt the shared phone components.
