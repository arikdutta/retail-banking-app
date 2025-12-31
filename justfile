# ── Dev ───────────────────────────────────────────────────────────────────────

dev:
    pnpm dev

desktop:
    pnpm desktop

# ── iOS ───────────────────────────────────────────────────────────────────────

[macos]
ios device="iPhone 16 Pro":
    #!/usr/bin/env bash
    set -e
    cd src-tauri/gen/apple && xcodegen generate && cd ../../..
    xcrun simctl boot "{{device}}" || true
    open -a Simulator
    cargo tauri ios dev "{{device}}"

[linux]
[windows]
ios device="":
    @echo "Error: iOS development requires macOS"
    @exit 1

# ── Android ───────────────────────────────────────────────────────────────────

android:
    cargo tauri android dev
