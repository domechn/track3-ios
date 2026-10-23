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
  refresh through the existing refresh flow, and a floating source-status
  sheet. Desktop routing remains available.
- Added reusable touch components in `src/components/mobile/`; their usage
  contract is in `docs/ios/MOBILE-UI.md`. History, comparison, cost basis,
  coin transactions, wallet analytics, and attribution now show phone rows,
  sheets, or date inputs instead of wide tables and popovers. Overview
  rankings and shared dialog styles fit phone widths. Comparison ranges
  support horizontal swipes; finance charts accept touch inspection.
- Local checks passed before review: `corepack yarn tsc --noEmit`; Vitest
  (205 files, 1,736 tests); Playwright mobile suite (18 tests); Rust pure tests
  (60 tests). Playwright saved 28 route screenshots in `test-results/mobile/`
  at 320, 375, 390, and 430 CSS pixels. Each route check waits for content
  to load, then asserts no document overflow or clipped visible leaf text
  and checks bottom safe-area clearance.
- Review follow-up: iOS foundation run `39944121990` built but failed at
  simulator launch. Its stack traced to formatting Invalid Dates on an empty
  database. Fresh portfolios now receive an empty date range, and date range
  persistence checks validity before formatting. The iOS error report now
  includes the message. A new app render test covers the empty portfolio.
- Viewport screenshots now use viewport capture; full-page capture made
  Chromium switch to desktop layout during screenshot. The route loop also
  visits More and Goals, and the history list gets a scrolled screenshot.
  History swipe actions handle canceled pointers, leave the tab order while
  concealed, and suppress the accidental row tap after a swipe. The suite
  exercises swipe, delete confirmation, and undo. History pagination stays
  together at phone width. The Pro header total polls, pull to refresh awaits
  the actual refresh promise, and the portfolio change value can be toggled
  by touch. The allocation chart accepts nearby taps.
- Review follow-up local checks passed: `corepack yarn tsc --noEmit`;
  Vitest (207 files, 1,743 tests); Playwright mobile suite (21 tests).
  The final Playwright run saved 40 viewport screenshots in
  `test-results/mobile/` at 320, 375, 390, and 430 CSS pixels. Live DOM
  metrics check overflow, clipped text, tab visibility, and safe-area
  clearance; a 390pt history screenshot and a 320pt scrolled history-list
  screenshot were visually inspected.
- The run also hit GitHub Actions artifact storage quota when uploading
  simulator evidence and unsigned builds. Upload failure is now nonfatal so
  the next job can report the simulator result independently. Artifact
  retention remains unavailable until GitHub recalculates or frees quota.
- CI run `39949174467` built and launched the simulator app and built the IPA,
  but its final generated Xcode project diff check failed. This follow-up
  matches the two generated files to that exact CI diff. The mobile shell now
  covers coarse-pointer landscape widths through 950px, avoids a second
  hidden Pro total poll, and exposes the last refresh time while pulling.
  Finance charts gate touch drags behind a long press and allow vertical page
  scrolling. The toast close control is visible, named, and 44px wide on
  touch screens. History has one mobile `h1`; the More settings link uses its
  canonical route so Back returns through configuration to More.
- This follow-up passed `corepack yarn tsc --noEmit`, Vitest (207 files,
  1,745 tests), and the full mobile Playwright suite (24 tests). Playwright
  saved 40 PNGs in `test-results/mobile/`; all have the expected dimensions.
  The route sweep checked overflow, clipped text, tab visibility, and
  injected safe-area clearance at 320, 375, 390, and 430 CSS pixels.
- Reviewer follow-up: the Xcode project check now restores the committed
  variable based `Info.plist` and its trailing newline after Tauri rewrites
  the file. Portal sheet gestures no longer trigger page refresh or swipe-back.
  Sheet detents track the handle during a drag. Phone data routes have one
  `h1`, history rows retain logo previews, mobile inputs use at least 16px
  text, and `/more` renders on desktop.
- Local checks after this follow-up passed: `corepack yarn tsc --noEmit`;
  Vitest (208 files, 1,748 tests); Playwright mobile suite (26 tests).
  The four viewport sweeps regenerated 40 PNGs in `test-results/mobile/`
  and checked width, clipped text, tab visibility, and safe-area clearance.
  The comparison sheet tests cover portal drag isolation and both detents.
- Reviewer follow-up: pushed routes now open at the top, the sticky header
  keeps Back visible, and tab switches restore their saved scroll position.
  Tapping the active tab returns to its root or scrolls that root to the top.
  The Analytics root links to Wallets, Comparison, and Cost basis; More keeps
  its own routes. The latest history snapshot has a visible delete action in
  its detail. Phone gestures are gated by the mobile media query, and touch
  icons remain visible on wider touch displays. Locale keys added for S2
  are at the end of both files, and the duplicate empty-date guard was removed.
  This review explicitly requested that correction in S3-owned
  `configuration.ts`. The existing S2 edits to S3-owned `refresh-data.tsx`
  register the pull-to-refresh callback and its loading guard; the driver
  should reconcile them with S3 before merging.
- macOS CI run `39957522652` passed on the previous HEAD. This follow-up
  still needs a new CI run after the driver commits and pushes it.
  Local checks for this follow-up passed: `corepack yarn tsc --noEmit`,
  Vitest (208 files, 1,748 tests), and Playwright mobile (31 tests).
  Playwright regenerated 40 PNGs under `test-results/mobile/`; all have
  the expected 2x dimensions, and the route sweep checked horizontal
  overflow, clipped text, tab visibility, and safe-area clearance.
  Physical-device interaction checks and a native haptic bridge remain pending. The
  shared haptic hook uses vibration where a WebView supports it; WKWebView
  needs a native bridge for physical feedback. S3-owned screens will need
  to adopt the shared phone components.

## S3 feature screens and native integrations

The S2 shell and S3 screens are now combined in this worktree. Native behavior
still needs simulator and device validation. The last S3 iOS run
`39951716004` reached the final committed-project check, which failed because
Tauri rewrote the Xcode product name and plist versions. The combined project
restores the committed values before that check; CI has not rerun it yet.

- iPhone Settings now opens focused pages for data sources, base currency,
  appearance, language, blacklist, Pro, assistant configuration, security,
  backup, sync, and About. Desktop settings retain their existing layout.
  `src/components/mobile-compat/` provides the page and dialog patterns used
  by these screens alongside the S2 mobile components.
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
- End-to-end reachability for the whole README feature list needs validation
  with the combined S2 navigation and S3 settings pages.
- The assistant chat height still uses a fixed shell offset. It must be
  checked against the combined header and tab bar.

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
