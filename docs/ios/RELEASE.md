# iOS release and signing

## Release gate

Run `corepack yarn tsc --noEmit`, `corepack yarn vitest run`,
`corepack yarn tsc -p tests/e2e/tsconfig.json --noEmit`, and the three
mobile Playwright files named in the [README](../../README.md). Run
`cargo test --locked -p track3-pure-tests --lib` from `src-tauri`.
The `ios-foundation.yml` web and macOS iOS jobs must pass on the release
commit. Check that the simulator launch produced a rendered screenshot,
the ready marker, no crash report, and an unsigned device IPA. A CI success
does not replace the signed physical-device checks below.

The `iOS foundation` workflow builds an unsigned simulator `.app` bundle and
unsigned device `.ipa`. Routine runs attempt to upload simulator screenshots
and launch logs. A manual `workflow_dispatch` run also attempts to upload
`Track3-simulator.app.zip` and `Track3-unsigned.ipa`.
The GitHub Actions artifact quota was exhausted in run `39926851914`;
the repository owner must clear old artifacts before these uploads can succeed.
Upload errors are nonfatal so the launch diagnostics still reach the run log.
The unsigned device IPA will not install on a device without valid Apple
signing and a provisioning profile.

## Signed device checks before TestFlight

1. Install a signed build on an iPhone with a passcode. Check fresh launch,
   lock after backgrounding, Face ID or Touch ID fallback, and the privacy
   cover in the app switcher.
2. Add an exchange, wallet and IBKR Flex source; refresh and inspect the
   source status sheet, portfolio, history, profit, cost basis, and charts.
   Inspect chart points by touch and confirm pages scroll normally.
3. Create and acknowledge an alert. Check notification permission,
   foreground delivery and the app icon badge. iOS may defer delivery when
   Track3 is suspended.
4. Export, share and import a JSON file through Files. Check the filename,
   import confirmation and conflict choice. Check an automatic backup in
   Track3's Documents folder and a user-moved copy in iCloud Drive.
5. Set a known encryption key and save it separately, export configuration,
   rotate the key, then verify the app can reopen. Test recovery from an
   interrupted rotation. Restore to a second device with the known key;
   the original device-only Keychain item does not transfer.
6. Use the assistant chat with a configured provider and confirm that a
   proposed write requires approval. Check the composer above the keyboard
   and Back navigation through Settings and other tabs.

Record device, iOS version, signed build identifier, and results in the
release record. Background refresh, backup and sync execute while the app is
active; WKWebView may be suspended after backgrounding.

To distribute through TestFlight, open the committed project in
`src-tauri/gen/apple` on a Mac, select the Track3 iOS target, set the Apple
development team and the `dev.track3.ios` App ID, and enable the Data
Protection entitlement in its provisioning profile. Archive a release build
for a physical device, sign it with an Apple Distribution certificate, and
upload the archive through Xcode Organizer or App Store Connect. Verify the
signing profile contains the default Data Protection entitlement and test
database open, key rotation, import/export, and notifications on a device.
Before testing device restore, set and retain a known encryption key in
Security and export the configuration. The automatically generated iOS
Keychain item is device-only and cannot be recovered after a restore.

CI runs `corepack yarn tauri ios init --ci` only when the committed project
is absent. After configuration and icon generation, CI checks for drift from
the committed project. Run `python3 scripts/ios/configure-project.py` when
bumping the app version and commit the resulting Xcode project changes.

If artifact upload is unavailable, recover the screenshot printed in the run
log:

```bash
gh run view <run-id> --log > /tmp/track3-ios-run.log
rg -o 'Z TRACK3_SCREENSHOT_CHUNK:[A-Za-z0-9+/=]+' /tmp/track3-ios-run.log | cut -d: -f2 | tr -d '\n' | base64 -d > /tmp/track3-launch.png
```

If the ready gate fails, use `TRACK3_INITIAL_SCREENSHOT_CHUNK` in the same
pipeline to inspect the earlier screenshot.
