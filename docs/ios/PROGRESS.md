# iOS port progress

## S1 foundation

- Done locally: Tauri mobile library entry point and iOS configuration;
  mobile capability and desktop plugin gating; platform state provider;
  viewport and iOS theme defaults; iOS Info.plist and Data Protection project
  configuration; macOS simulator/device CI workflow; architecture and release
  documentation. The workflow now builds the frontend before Rust checks,
  verifies bundled migration SQL and a nonblank simulator screenshot, checks
  the app process after capture, and can package an unsigned IPA from a built
  device app if Tauri does not export one.
- Verified after this review: `corepack yarn tsc --noEmit` and
  `corepack yarn vitest run` (1,702 tests across 197 files). Earlier
  verification covered a frontend production build and 50 Rust pure tests.
  The generated project configuration script passed an idempotence self-check.
- CI run `39921354066` failed because `cargo check` ran before `dist` existed.
  The Xcode project upload then hit an account-level artifact storage quota.
  The new workflow builds `dist` first and sets one-day artifact retention;
  quota recovery still depends on GitHub recalculating usage or clearing old
  account artifacts.
- Pending verification: a new macOS Rust target check, simulator installation
  and launch, screenshot review, unsigned IPA build, and signed device validation.
  An iPhone-sized browser preview cannot validate startup:
  it has no Tauri bridge and reports a missing `invoke` function.
- Pending repository artifact: generated `src-tauri/gen/apple` Xcode project.
  Linux cannot run `tauri ios init`; CI must upload it as `xcode-project` after
  the driver commits and pushes this worktree. The generated project must then
  be downloaded and added in a later round.
- Pending mobile backup work: automatic backups to a user-selected external
  directory need persistent security-scoped access across launches. The mobile
  filesystem scope also needs `$DOCUMENT/**` before shared Documents can be
  used for backup export.

The S1 exit condition is **not yet met**. No successful iOS CI result or
simulator screenshot is available in this worktree yet.
