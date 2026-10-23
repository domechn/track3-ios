# iOS build and signing

The `iOS foundation` workflow builds an unsigned simulator `.app` bundle and
unsigned device `.ipa`. Routine runs attempt to upload simulator screenshots
and launch logs. A manual `workflow_dispatch` run also attempts to upload
`Track3-simulator.app.zip` and `Track3-unsigned.ipa`.
The GitHub Actions artifact quota was exhausted in run `39926851914`;
the repository owner must clear old artifacts before these uploads can succeed.
Upload errors are nonfatal so the launch diagnostics still reach the run log.
The unsigned device IPA will not install on a device without valid Apple
signing and a provisioning profile.

To distribute through TestFlight, open the committed project in
`src-tauri/gen/apple` on a Mac, select the Track3 iOS target, set the Apple
development team and the `dev.track3.ios` App ID, and enable the Data
Protection entitlement in its provisioning profile. Archive a release build
for a physical device, sign it with an Apple Distribution certificate, and
upload the archive through Xcode Organizer or App Store Connect. Verify the
signing profile contains the default Data Protection entitlement and test
database open, key rotation, import/export, and notifications on a device.
Before testing device restore, set and retain a known encryption key in Data
Management and export the configuration. The automatically generated iOS
key is excluded from backups and cannot be recovered after a restore.

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
