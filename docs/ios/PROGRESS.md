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

## S3 feature screens and native integrations

The S3 exit condition is **not yet met**: Keychain storage, S2 navigation
integration, and macOS CI/device validation remain open.

- iPhone Settings now opens focused pages for data sources, base currency,
  appearance, language, blacklist, Pro, assistant configuration, security,
  backup, sync, and About. Desktop settings retain their existing layout.
  Temporary `src/components/mobile-compat/` wrappers cover the S2 mobile
  primitives until the driver integrates both steps.
- Exchanges, wallets, IBKR Flex, and custom holdings have phone source lists
  and full-screen add/edit forms. Provider selection precedes credentials;
  credential fields suppress autocorrection and mask secrets. Existing source
  validators, Pro gating, attachments, and quick views remain connected.
  Source deletion and backup restore use confirmation sheets.
- Backup settings keep Files import/export and the existing automatic backup
  format. iPhone export also opens the native share sheet. Automatic backups
  use Track3's Documents directory, which S1 exposes in Files, including
  iCloud Drive when the user moves files there. Alerts use the existing local
  notification permission flow and now update the app icon badge.
- The assistant has a full phone chat and session view with a composer that
  follows the visual viewport above the keyboard and collapsed tool activity.
  Alert editing opens as a page; rebalance targets have touch sliders;
  refresh opens a progress sheet with existing source status and retry.
  The backup status is visible without hover.
- A small Swift bridge supplies Face ID, Touch ID, or device passcode app
  lock, an opaque app-switcher privacy cover, haptics, badge updates, and the
  iOS share sheet. Rust commands and the generated Xcode project include the
  bridge. The iOS GitHub Actions job now typechecks the Swift source.

### Remaining S3 work and verification limits

- The S1 encryption key is a Data Protection protected, backup-excluded
  `.ent-key` file rather than an iOS Keychain item. Moving it or the
  configuration secrets to Keychain needs a coordinated change to S1's
  atomic key-rotation and restore protocol. This Keychain requirement is
  still open.
- Wallet QR scanning is not implemented. Users can type or paste addresses;
  camera permission is not requested.
- Automatic backup and refresh run while the app is active. iOS can suspend
  WKWebView work in the background, so scheduled execution after suspension
  is not guaranteed; no BGTaskScheduler integration exists.
- Native lock, privacy cover, badge, haptics, share sheet, Files visibility,
  and background behavior still need simulator and physical-device checks.
  Swift and the iOS app can only be compiled by the macOS CI job after the
  driver commits and pushes this worktree.
- End-to-end reachability for the whole README feature list depends on
  merging S2's phone navigation and portfolio screens. S3's settings hub and
  feature pages are reachable in the isolated iPhone browser fixture.

### S3 local checks

- `corepack yarn tsc --noEmit` passed.
- `corepack yarn vitest run` passed: 1,747 tests in 209 files, including
  English/Chinese catalog parity.
- `E2E_PORT=1423 corepack yarn playwright test
  tests/e2e/ios-settings.spec.ts --workers=1` passed: four browser checks,
  including 375, 390, and 430 pixel widths.
- `corepack yarn build` passed. Vite reported existing circular chunk and
  size warnings.
- `cargo test --locked -p track3-pure-tests --lib` passed: 60 tests.
