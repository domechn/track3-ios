# iOS build and signing

The `iOS foundation` workflow builds an unsigned simulator `.app` and an
unsigned device `.ipa`. Artifact storage is currently exhausted for this
GitHub account, so the workflow temporarily attempts only the Xcode project,
screenshot, and launch log uploads, and treats upload errors as nonfatal. The device IPA is still
built on the runner but cannot be downloaded until artifact uploads resume.
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

CI runs `corepack yarn tauri ios init --ci` only when the project is absent.
If the `xcode-project` artifact uploads successfully, download it with
`gh run download <run-id> -n xcode-project -D src-tauri/gen/apple`. Otherwise
recover the compressed project from the run log:

```bash
gh run view <run-id> --log > /tmp/track3-ios-run.log
mkdir -p src-tauri/gen/apple
rg -o 'TRACK3_XCODE_PROJECT_CHUNK:[A-Za-z0-9+/=]+' /tmp/track3-ios-run.log | cut -d: -f2 | tr -d '\n' | base64 -d | tar -xz -C src-tauri/gen/apple
```

Use `TRACK3_SCREENSHOT_CHUNK` with the same extraction pipeline (ending in
`> /tmp/track3-launch.png`) to inspect the simulator screenshot. The driver
must add the recovered Xcode project and app icons to the repository. The
project configuration script and icon copy should leave committed files
unchanged when re-run.
