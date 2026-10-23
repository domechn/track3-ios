# iOS port progress

## S1 foundation

- Latest pushed run `39929775797` failed in `cargo check` because the Tauri
  handler closure was bound without a runtime type. The builder chain is now
  split so the handler is passed directly to `invoke_handler`. A host main
  crate `cargo check --lib` was added to the web CI job, with its Linux system
  libraries installed first.
- The earlier simulator run `39926851914` stopped after boot with
  `getpwuid_r did not find a match for uid 501`; the log did not identify the
  exact command. The current launch step traces commands and retries app
  installation after transient simulator failures. The next macOS run must
  establish whether this resolves the failure.
- The committed Xcode project now uses `MARKETING_VERSION` and
  `CURRENT_PROJECT_VERSION` in Info.plist. The configuration script syncs
  those settings with `tauri.conf.json`, and CI checks that icon generation,
  configuration, and build leave `gen/apple` unchanged.
- A restored database with a missing `.ent-key` now gets a persistent notice
  linking to Settings when encrypted configuration cannot be read with the
  legacy key. Existing legacy databases with readable configuration remain
  supported. iOS export removes the temporary Documents placeholder after a
  successful external export and retains the selected Documents file.
- Routine CI runs now attempt to upload only simulator screenshots and logs.
  A manual `workflow_dispatch` run also attempts to upload the unsigned
  simulator `.app` zip and device `.ipa`. The repository owner's GitHub
  Actions artifact quota is still exhausted, so uploads may fail until storage
  is available.
- Local `corepack yarn tsc --noEmit` passed and `corepack yarn vitest run`
  passed (1,718 tests in 201 files). The CI probe Vite build and all 60 Rust
  pure tests passed.
  A local main crate `cargo check --lib` stopped in `glib-sys` because the
  Linux host lacks GLib development libraries; the CI web job now installs
  the required packages before checking.

The S1 exit condition is **not yet met**. The driver must commit and push
this worktree, then provide the macOS CI result. A green iOS job and a
rendered simulator screenshot artifact are still required. Physical device
and signed build checks remain pending.
