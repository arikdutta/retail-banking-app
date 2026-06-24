#!/usr/bin/env bash
# Usage:
#   ./deploy_prod.sh                        # full build + deploy
#   ./deploy_prod.sh skip                   # skip all builds, redeploy current images
#   ./deploy_prod.sh --skip-backend         # rebuild only frontend
#   ./deploy_prod.sh --skip-frontend        # rebuild only backend
#   ./deploy_prod.sh --skip-preflight       # ignore local uncommitted changes
set -e

# Ensure GitHub CLI is on PATH (winget installs it here on Windows)
export PATH="$PATH:/c/Program Files/GitHub CLI"

FORCE=false
SKIP_BACKEND=false
SKIP_FRONTEND=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --skip-preflight)  FORCE=true ;;
        --skip-backend)    SKIP_BACKEND=true ;;
        --skip-frontend)   SKIP_FRONTEND=true ;;
        *)                 ARGS+=("$arg") ;;
    esac
done

wait_all() {
    local status=0
    for pid in "$@"; do
        wait "$pid" || status=1
    done
    return $status
}

echo "🔍 Pre-flight checks..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo "❌ Must be on main branch (currently on '$BRANCH')"
    exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
    if [ "$FORCE" = "true" ]; then
        echo "⚠️  Uncommitted changes — deploying last pushed commit (--skip-preflight)"
    else
        echo "❌ Uncommitted changes. Commit or stash before deploying."
        exit 1
    fi
fi
echo "✅ On main, working tree is clean"

echo "🗄️  Running cargo sqlx prepare..."
(cd backend && export DATABASE_URL=postgres://postgres:password@127.0.0.1/retail_banking_app && cargo sqlx prepare)
git add backend/.sqlx/
if ! git diff --cached --quiet -- backend/.sqlx/; then
    echo "📝 .sqlx files changed — committing and pushing..."
    git commit -m "chore: update .sqlx query cache"
    git push origin main
fi
echo "✅ SQLx offline data is up to date"

echo "📦 Checking lockfile..."
(cd frontend && pnpm install --frozen-lockfile || { echo "❌ frontend/pnpm-lock.yaml is stale — run 'pnpm install' and commit"; exit 1; })
echo "✅ Lockfile up to date"

# Single nextest run covers export_bindings (ts-rs generation) AND all other
# tests. Splitting into two runs triggered a Windows Defender LNK1104 race:
# Defender holds the binary after the first run, causing the second link to
# fail. One run = one link = no race.
# On Windows, Defender may hold the stale binary open so rm -f silently fails.
# Rename it away (Windows allows rename on locked files) then retry on LNK1104.
echo "🧪 Running backend tests (includes ts-rs binding generation)..."
for f in backend/target/debug/deps/auth_backend-*.exe; do
    [ -f "$f" ] && mv "$f" "${f}.bak" 2>/dev/null || true
done
for attempt in 1 2 3; do
    (cd backend && cargo nextest run --no-fail-fast) && break
    if [ $attempt -eq 3 ]; then
        echo "❌ Tests failed after 3 attempts"
        exit 1
    fi
    echo "⚠️  LNK1104 race (attempt $attempt/3) — waiting 15s for Defender to release lock..."
    for f in backend/target/debug/deps/auth_backend-*.exe; do
        [ -f "$f" ] && mv "$f" "${f}.bak" 2>/dev/null || true
    done
    sleep 15
done
echo "✅ Backend tests passed"

echo "📦 Checking ts-rs bindings..."
if ! git diff --quiet frontend/bindings/; then
    echo "📝 Bindings changed — committing and pushing..."
    git add frontend/bindings/
    git commit -m "chore: regenerate TypeScript bindings"
    git push origin main
fi
echo "✅ Bindings up to date"

echo "🔷 TypeScript / Clippy / Audit + frontend tests (parallel)..."
pids=()
(cd frontend && npx tsc --noEmit) &
pids+=($!)
(cd backend && cargo clippy) &
pids+=($!)
(cd backend && cargo audit) &
pids+=($!)
(cd frontend && pnpm test) &
pids+=($!)
wait_all "${pids[@]}"
echo "✅ TypeScript, Clippy, Audit, frontend tests OK"

echo "🏗️  Building frontend..."
(cd frontend && pnpm run build)
echo "✅ Build OK"

SKIP_BUILD="${ARGS[0]:-false}"
if [ "$SKIP_BUILD" = "skip" ]; then
    SKIP_BUILD="true"
fi

echo "⬆️  Pushing main to origin..."
git push origin main
echo "✅ main is up to date on origin"

TAG_NAME="deploy_prod_$(date +'%Y/%m/%d_%Hh%Mm%Ss')"
git tag "$TAG_NAME"
git push origin "$TAG_NAME"

echo "🚀 Triggering deployment..."
gh workflow run prod.yml \
    -f skip_build="$SKIP_BUILD" \
    -f skip_backend="$SKIP_BACKEND" \
    -f skip_frontend="$SKIP_FRONTEND"

echo "✅ Deploy workflow triggered!"
echo "   Tag:             $TAG_NAME"
echo "   skip_build:      $SKIP_BUILD"
echo "   skip_backend:    $SKIP_BACKEND"
echo "   skip_frontend:   $SKIP_FRONTEND"
echo "   Track at:        https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
