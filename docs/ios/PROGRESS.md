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

The S3 exit condition is **not yet met**: S2 navigation has not been merged
here, and native behavior still needs simulator and device validation. The
last pushed iOS run `39951716004` reached the final committed-project check,
which failed because Tauri rewrote the Xcode product name and plist versions.
This worktree now generates and commits those values in Tauri's format; CI
has not rerun them yet.

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
  Alert editing uses a focus-trapping page with background scroll locked.
  Rebalance targets have touch sliders and 44 pt increment and decrement
  buttons; detailed iPhone results are cards instead of a wide table.
  refresh opens a progress sheet with existing source status and retry.
  The backup status is visible without hover.
- A small Swift bridge supplies Face ID, Touch ID, or device passcode app
  lock, an opaque app-switcher privacy cover, haptics, badge updates, and the
  iOS share sheet. The persistent encryption key now lives in a
  device-only iOS Keychain item. Existing protected `.ent-key` files migrate
  to Keychain on launch; key rotation and recovery now use the Keychain item.
  The rotation journal can temporarily contain key material during a crash
  recovery and remains protected and excluded from backup by S1's file policy.
- The Swift lock prompts after entering the background, covers the app
  switcher snapshot whenever activity resigns, even when app lock is off,
  and no longer reacts to keyboard windows. A device without an available
  passcode policy disables the lock
  and shows an explanation. The Rust iOS cdylib permits the Swift symbols to
  resolve at the final app link; the CI build now checks the final executable
  for every native bridge symbol. The Swift typecheck step is appended after
  the iOS build and artifact steps. A newly visible app window now receives
  the cover before an unlock prompt, and a timed-out settings prompt
  invalidates its authentication context. Badge updates use
  `UNUserNotificationCenter.setBadgeCount` on iOS 16 and newer; the installed
  notification plugin requests badge, alert, and sound permission together.
- Editing a saved source keeps its attachment identity fixed. The alert
  editor has a Cancel button, and refresh hides old source results until the
  current run finishes.
- The current review removes the blocking Keychain retry loop and fabricated
  simulator signature. A simulator lacking Keychain entitlement uses a
  protected, backup-excluded key file. Other startup key errors leave Track3
  locked with the database closed instead of panicking; a temporary key error
  retries when the app becomes active or the user taps Retry. CI prints recent
  crash details in the job log; upload quota errors no longer mask the launch
  result. Mobile dialogs trap focus, lock background scrolling, and dismiss
  through Escape or a backdrop tap. Changing a new exchange's provider clears
  its old password and passphrase. The iPhone Pro page keeps license entry
  but hides external subscription links. The share sheet preserves the
  export filename by staging it in a private UUID directory as
  `track3-export-data.json`. The System theme choice is limited to iOS.

### Remaining S3 work and verification limits

- Wallet QR scanning is not implemented. Users can type or paste addresses;
  camera permission is not requested.
- Automatic backup and refresh run while the app is active. iOS can suspend
  WKWebView work in the background, so scheduled execution after suspension
  is not guaranteed; no BGTaskScheduler integration exists.
- Keychain migration, native lock, privacy cover, badge, haptics, share sheet,
  Files visibility, and background behavior still need simulator and
  physical-device checks. In particular, cold-start lock coverage must be
  checked on a device after launch with lock enabled. The current native and
  project-file fixes are pending a macOS CI run;
  no rendered simulator screenshot is verified on this worktree yet. A
  Keychain failure leaves the portfolio locked; the debug startup log reports
  its OSStatus.
  Swift and the iOS app can only be compiled by the macOS CI job after the
  driver commits and pushes this worktree.
- End-to-end reachability for the whole README feature list depends on
  merging S2's phone navigation and portfolio screens. S3's settings hub and
  feature pages are reachable in the isolated iPhone browser fixture.
- The assistant chat height still uses a fixed shell offset. It must be
  checked against S2's final header and tab bar after the merge. The
  `isValid` date guard in `src/components/index/index.tsx` came from S3 but
  belongs to S2's file; preserve or reconcile it during the merge.

### S3 local checks

- `corepack yarn tsc --noEmit` passed after the current review fixes.
- `corepack yarn vitest run` passed: 1,771 tests in 212 files, including
  English/Chinese catalog parity.
- `E2E_PORT=1423 corepack yarn playwright test
  tests/e2e/ios-settings.spec.ts --workers=1` passed: 14 browser checks at
  375, 390, and 430 pixel widths. It covers the remaining settings pages,
  assistant composer, alert editor, rebalance cards with data, and refresh
  sheet.
- Previously, `cargo test --locked -p track3-pure-tests --lib` passed: 60
  tests. It was not rerun for this review pass.
