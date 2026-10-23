# iOS port progress

## S1 foundation

- CI run `39923565686` passed the web job, both iOS Rust target checks, the
  unsigned simulator and device builds, simulator install and launch, process
  checks, screenshot capture, and IPA creation. Its two artifact uploads failed
  because the account's GitHub Actions artifact storage quota was exhausted.
  No screenshot or generated project from that run is available to inspect.
- This round adds an iOS readiness signal after the frontend loads
  configuration, queries SQLite, and renders the overview heading. CI now
  requires the signal and a screenshot with at least 5% varied samples. It
  prints a compressed screenshot and the generated Xcode project as
  recoverable base64 log chunks. Artifact upload errors no longer mask build
  and launch results while the account quota is exhausted. Screenshot and log
  uploads remain configured; simulator ZIP and IPA uploads are temporarily
  omitted. The unsigned device IPA is still built.
- Exports now write their data before the iOS document picker opens. Manual
  automatic backup setup uses the app's Documents directory on iOS, which
  remains available across launches and is accessible through Files and
  Finder. The mobile filesystem scope includes Documents. The app shell
  respects iOS safe area insets, and narrow desktop windows stay classified
  as desktop.
- Encryption key files and rotation journals are marked
  `NSURLIsExcludedFromBackupKey` on iOS. A restored device cannot decrypt
  configuration encrypted with a custom key; users need their exported
  configuration and its key to recover it. Device restore testing is pending.
- The Rust library is named `track3_lib`, avoiding a Windows artifact name
  collision with the `track3` binary.
- Local verification for this round: `corepack yarn tsc --noEmit` passed,
  `corepack yarn vitest run` passed (1,711 tests in 200 files), and
  `cargo test --locked -p track3-pure-tests --lib` passed (50 tests). iOS
  compilation and simulator validation require the next macOS CI run.

The S1 exit condition is **not yet met**. These changes need another macOS CI
run and visual inspection of its screenshot. The generated
`src-tauri/gen/apple` project still needs to be recovered from the next run's
log (or artifact, if quota recovers) and added to the repository by the driver.
Only the driver commits and pushes. Physical device and signed build checks
remain pending.
