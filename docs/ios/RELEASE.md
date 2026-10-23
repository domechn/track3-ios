# iOS build and signing

The `iOS foundation` workflow builds an unsigned simulator `.app` (inside
`Track3-simulator-app.zip`) and an unsigned device `.ipa`. Unzip the simulator
artifact, then install it with `xcrun simctl install booted Track3.app`. The unsigned device IPA is
an intermediate artifact; iOS will not install it on a device without valid
Apple signing and a provisioning profile.

To distribute through TestFlight, open the committed project in
`src-tauri/gen/apple` on a Mac, select the Track3 iOS target, set the Apple
development team and the `dev.track3.ios` App ID, and enable the Data
Protection entitlement in its provisioning profile. Archive a release build
for a physical device, sign it with an Apple Distribution certificate, and
upload the archive through Xcode Organizer or App Store Connect. Verify the
signing profile contains the default Data Protection entitlement and test
database open, key rotation, import/export, and notifications on a device.

CI runs `corepack yarn tauri ios init --ci` only when the project is absent.
The `xcode-project` artifact contains the generated project. Download it with
`gh run download <run-id> -n xcode-project -D src-tauri/gen/apple`, add the
generated files to the repository, and let subsequent CI builds use that
committed project.
