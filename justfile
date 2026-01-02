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
    [ -f .env ] && set -a && source .env && set +a
    TEAM="${APPLE_TEAM_ID:-}"
    if [ -z "$TEAM" ]; then echo "Error: APPLE_TEAM_ID not set. Add it to .env or ~/.zshrc" && exit 1; fi
    # Expand env var in project.yml (xcodegen doesn't do this itself)
    sed -i '' "s|\${APPLE_TEAM_ID}|$TEAM|g" src-tauri/gen/apple/project.yml
    cd src-tauri/gen/apple && xcodegen generate && cd ../../..
    xcrun simctl boot "{{device}}" 2>/dev/null || true
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
