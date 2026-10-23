#!/usr/bin/env python3
"""Set the iOS data protection default on Tauri's generated Xcode project."""

from pathlib import Path
import plistlib
import re

apple = Path("src-tauri/gen/apple")
project = apple / "project.yml"
text = project.read_text()
entry = re.search(r"(?m)^    entitlements:\n      path: ([^\n]+)\n", text)
if entry is None:
    raise SystemExit("generated iOS entitlements path missing")

protection = "NSFileProtectionCompleteUntilFirstUserAuthentication"
key = "com.apple.developer.default-data-protection"
if key not in text:
    text = text[:entry.end()] + f"      properties:\n        {key}: {protection}\n" + text[entry.end():]
    project.write_text(text)

entitlements = apple / entry.group(1)
if entitlements.exists():
    with entitlements.open("rb") as file:
        data = plistlib.load(file)
else:
    entitlements.parent.mkdir(parents=True, exist_ok=True)
    data = {}
data[key] = protection
with entitlements.open("wb") as file:
    plistlib.dump(data, file)
