# iOS port progress

## S1 foundation

- Done locally: Tauri mobile library entry point and iOS configuration;
  mobile capability and desktop plugin gating; platform state provider;
  viewport and iOS theme defaults; iOS Info.plist and Data Protection project
  configuration; macOS simulator/device CI workflow; architecture and release
  documentation.
- Verified locally: TypeScript type check, frontend production build, all 1,700
  Vitest tests across 196 files, and 50 Rust pure tests. The generated project
  configuration script passed an idempotence self-check.
- Pending verification: macOS Rust target checks, simulator installation and
  launch, screenshot review, unsigned IPA build, and signed device validation.
  An iPhone-sized browser preview cannot validate startup:
  it has no Tauri bridge and reports a missing `invoke` function.
- Pending repository artifact: generated `src-tauri/gen/apple` Xcode project.
  Linux cannot run `tauri ios init`; CI will upload it as `xcode-project` after
  the driver commits and pushes this worktree. The generated project must then
  be downloaded and added by the driver in a later round.

The S1 exit condition is **not yet met**. No iOS CI result or simulator
screenshot is available in this worktree yet.
