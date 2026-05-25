# Plan: App Improvements

## Context

Full audit: frontend UI, backend security, DB schema, tests.
App is a showcase — no KYC/AML/compliance needed, but should look credible as a banking domain project.

---

## Scope

```
Phase 1 — Critical UX fixes          (dashboard works correctly)
Phase 2 — Error/empty states         (resilience)
Phase 3 — Analytics page             (real feature, Recharts installed)
Phase 4 — Backend security           (error leaks, JWT crash, cookie flag, CORS)
Phase 5 — DB architecture            (double-entry, audit trail, idempotency)
Phase 6 — Backend input validation   (handlers trust payload blindly today)
Phase 7 — Observability              (structured logging with tracing)
Phase 8 — Tests                      (zero coverage today)
Phase 9 — PWA                        (plugin installed, not configured)
Phase 10 — Accessibility             (a11y gaps on forms/modals)
Phase 11 — Code cleanup              (utils, constants)
Phase 12 — Stub pages                (messages, help, settings)
```

---

## Phase 1 — Critical UX Fixes

**Files:** `frontend/domain/dashboard/page-dashboard.tsx`

### 1.1 Wire "View all" buttons

| Line | Widget | Target route |
|------|--------|-------------|
| 165 | Recent transactions "View all" | `/dashboard/transactions` |
| 294 | Activity feed "View all" | `/dashboard/transactions` |
| 403 | Statistics "View all" | `/dashboard/analytics` |

Replace dead `<button>` with `<Link to="...">` (TanStack Router).

### 1.2 Implement "Receive" button (line 254)

Copy account IBAN to clipboard + toast confirmation. Simplest viable.

### 1.3 Implement "More" button (line 264)

Radix `DropdownMenu` (already in deps) with: View statements, Download PDF, Settings.

### 1.4 Replace hardcoded data

| Line | Current value | Fix |
|------|--------------|-----|
| 225 | `$24,098.00` balance | Pull from account balance query — **data integrity bug** |
| 227 | `VISA` card brand | Pull from account data |
| 230 | `"Rust Finance."` | App config constant or user profile |
| 118 | `"Jan 10 – Jan 16"` | Compute from selected date range state |

---

## Phase 2 — Error & Empty States

**Files:** `page-dashboard.tsx`, shared components

### 2.1 Error UI on failed queries

Each section needs:
```tsx
if (query.isError) return <ErrorCard message="Failed to load. Retry?" onRetry={query.refetch} />
```

Create `frontend/components/ui/error-card.tsx`.

### 2.2 Empty states

Each list/table needs:
```tsx
if (data.length === 0) return <EmptyState icon={...} message="No transactions yet" />
```

Create `frontend/components/ui/empty-state.tsx`.

---

## Phase 3 — Analytics Page

**File:** `frontend/src/routes/dashboard/analytics.tsx`

Replace "coming soon" with real charts. Recharts already installed.

### Charts

| Chart | Data source | Type |
|-------|------------|------|
| Monthly spending | `/api/transactions` grouped by month | Bar chart |
| Spending by category | `/api/transactions` grouped by category | Pie chart |
| Balance over time | derived from ledger (after Phase 5) or account snapshots | Line chart |

### Layout

```
┌─────────────────────────────────────────────┐
│  Analytics                    [Date picker] │
├──────────────────┬──────────────────────────┤
│  Monthly Spend   │   Spending by Category   │
│  (Bar chart)     │   (Pie chart)            │
├──────────────────┴──────────────────────────┤
│  Balance Over Time (Line chart, full width) │
└─────────────────────────────────────────────┘
```

May need new backend endpoint for aggregated data grouped by month/category.

---

## Phase 4 — Backend Security

### 4.1 Error leaks (multiple files)

All handlers expose raw `error.to_string()` / `Db(...)` internals to client.

**Fix:** Create `backend/src/error.rs` with custom `AppError` type:
```rust
pub enum AppError {
    NotFound,
    Unauthorized,
    Internal,  // log internally, return generic message to client
}
```

Files to fix:
- `auth/handler.rs:54`
- `transactions/handler.rs:75, 134`
- `transfers/handler.rs:49`
- `accounts/handler.rs:22, 43`

### 4.2 JWT_SECRET panic (auth/handler.rs:22-24)

`expect()` on missing env var crashes server at runtime.

```rust
// before
let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

// after
let secret = env::var("JWT_SECRET").map_err(|_| AppError::Internal)?;
```

Or validate all required env vars at startup in `main.rs`.

### 4.3 Role parse silent default (auth/middleware.rs:70)

Invalid role string silently becomes `RegularUser`. Hides data corruption.

```rust
// before
.unwrap_or(Role::RegularUser)

// after
.map_err(|_| AppError::Unauthorized)?  // or log + reject
```

### 4.4 Cookie secure flag

`auth/handler.rs:105` — secure flag gated on `NODE_ENV=production`. Fine for dev, but document this explicitly.

### 4.4 CORS audit

Verify backend doesn't use `AllowAny` origin. Lock to frontend URL via env var:

```rust
let cors = CorsLayer::new()
    .allow_origin(env::var("FRONTEND_URL").unwrap_or_default().parse::<HeaderValue>()?)
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_credentials(true);
```

### 4.5 Rate limiting

No rate limiting on `POST /auth/login` or `POST /transfers`. Add tower middleware (e.g. `tower-governor`) at router level.

---

## Phase 5 — DB Architecture (Showcase-grade)

### 5.1 Double-entry bookkeeping

Core banking concept. Currently transactions are one-sided.

**Add table:**
```sql
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(19,4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Every transfer creates 2 ledger entries: DEBIT on source, CREDIT on destination.

### 5.2 Balance as derived value

Current: `balance` is mutable column on `accounts` (can drift from reality).

Better: `balance = SUM(credits) - SUM(debits)` from `ledger_entries`.

Keep `balance` column as cache, but add reconciliation check. Or computed view:
```sql
CREATE VIEW account_balances AS
SELECT account_id,
       SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END) AS balance
FROM ledger_entries
GROUP BY account_id;
```

### 5.3 Balance history (for analytics line chart)

Without ledger, impossible to show balance at past dates.
With ledger entries + timestamps, query becomes:
```sql
SELECT date_trunc('day', created_at) as day,
       SUM(...) OVER (ORDER BY created_at) as running_balance
FROM ledger_entries WHERE account_id = $1
```

### 5.4 Audit trail

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by UUID REFERENCES users(id),
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Populate via Postgres triggers or manually in handlers.

### 5.5 Idempotency keys on transfers

```sql
ALTER TABLE transfers ADD COLUMN idempotency_key UUID UNIQUE;
```

Handler checks: if key already exists → return existing result, skip processing.

### 5.6 Soft-delete consistency

Add `deleted_at TIMESTAMPTZ` to: `accounts`, `transactions`, `recipients`.
Already on `users`. Inconsistency is a smell.

### 5.7 Amount precision

`NUMERIC(15,2)` → `NUMERIC(19,4)`. 2 decimal places = USD fine, but 4 = safe for multi-currency (EUR, crypto, etc.).

---

## Phase 6 — Tests

Currently: 2 Rust test files (middleware + pdf), 0 integration tests, 0 frontend tests.

### Priority test cases

| Test | Type | Why |
|------|------|-----|
| Login success/fail | Integration | Auth is critical path |
| Transfer deduplication | Integration | Double-charge prevention |
| Role middleware | Unit | Already partially tested, extend |
| Ledger balance consistency | Integration | After Phase 5 |
| Transfer race condition | Concurrent integration | Two simultaneous transfers |

### Frontend

Add Vitest tests (already in deps) for:
- `useMoneyFlow()` hook
- Form validation (Zod schemas)
- Date formatting utils

---

## Phase 6 — Backend Input Validation

Currently handlers deserialize request body via `Json(payload)` with no validation — malformed or out-of-range values reach the DB layer.

### 6.1 Add `validator` crate

```toml
# Cargo.toml
validator = { version = "0.18", features = ["derive"] }
```

### 6.2 Annotate models

```rust
use validator::Validate;

#[derive(Deserialize, Validate)]
pub struct CreateTransferPayload {
    #[validate(range(min = 0.01, max = 1_000_000.0))]
    pub amount: f64,

    #[validate(length(min = 15, max = 34))]
    pub recipient_iban: String,
}
```

### 6.3 Validate in handlers

```rust
pub async fn create_transfer(
    Json(payload): Json<CreateTransferPayload>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate().map_err(|_| AppError::BadRequest)?;
    // ...
}
```

**Priority endpoints:** `POST /transfers`, `POST /auth/login`, `POST /invoices`, `PUT /accounts`.

---

## Phase 7 — Observability

Zero structured logging today. Runtime errors invisible without logs.

### 7.1 Add tracing

```toml
# Cargo.toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
```

### 7.2 Init in main.rs

```rust
tracing_subscriber::fmt()
    .json()
    .with_env_filter(EnvFilter::from_default_env())
    .init();
```

### 7.3 Instrument handlers

```rust
#[tracing::instrument(skip(pool))]
pub async fn create_transfer(...) {
    tracing::info!(amount = %payload.amount, "transfer initiated");
    // on error:
    tracing::error!(err = %e, "transfer failed");
}
```

Log: request start, auth events (login/logout), transfer created/failed, DB errors (internally only — never leak to client).

---

## Phase 8 — Tests

Currently: 2 Rust test files (middleware + pdf), 0 integration tests, 0 frontend tests.

### Priority test cases

| Test | Type | Why |
|------|------|-----|
| Login success/fail | Integration | Auth is critical path |
| Transfer deduplication | Integration | Double-charge prevention |
| Role middleware | Unit | Already partially tested, extend |
| Ledger balance consistency | Integration | After Phase 5 |
| Transfer race condition | Concurrent integration | Two simultaneous transfers |
| Input validation rejection | Unit | After Phase 6 |

### Frontend

Add Vitest tests (already in deps) for:
- `useMoneyFlow()` hook
- Form validation (Zod schemas)
- Date formatting utils

---

## Phase 9 — PWA

`vite-plugin-pwa` installed but no manifest or service worker configured.

### 9.1 Configure in vite.config.ts

```ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Retail Banking',
    short_name: 'Banking',
    theme_color: '#1a1a2e',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  },
})
```

### 9.2 Add icons

Generate 192×192 and 512×512 PNG icons. Place in `frontend/public/`.

**Result:** App installable on mobile/desktop, works offline for cached routes. Strong showcase signal.

---

## Phase 10 — Accessibility

Radix UI handles most primitives but gaps remain.

### Issues likely present

- Form inputs without visible `<label>` (or label not associated via `htmlFor`)
- Modal focus not trapped on open (Radix Dialog handles this — verify it's used)
- No `aria-live` on toast notifications (Sonner may handle this — verify)
- Color contrast on muted text with Tailwind dark theme
- Missing `alt` text on avatar/card images

### Fix approach

Run `axe-core` in dev:
```bash
pnpm add -D @axe-core/react
```

```tsx
// main.tsx (dev only)
if (import.meta.env.DEV) {
  const axe = await import('@axe-core/react')
  axe.default(React, ReactDOM, 1000)
}
```

Axe reports violations in browser console. Fix reported issues.

---

## Phase 11 — Code Cleanup

### 11.1 Extract `fmtDate` (page-dashboard.tsx:58-60)

Move to `frontend/src/lib/utils/date.ts`.

### 11.2 Extract color constants (page-dashboard.tsx:54-56)

Move to `frontend/src/lib/config/chart-colors.ts`.

### 11.3 Fix env access (page-dashboard.tsx:38)

```ts
// before
import.meta.env["VITE_API_URL"]

// after
import.meta.env.VITE_API_URL ?? ""
```

---

## Phase 12 — Stub Pages

Low priority. After phases 1-10.

- **Messages:** Static FAQ or contact form. No backend needed.
- **Help:** Keyboard shortcuts, docs links, support email.
- **Settings:** Theme toggle (dark/light already in stack), language, notification prefs.

---

## File Impact Summary

```
frontend/domain/dashboard/page-dashboard.tsx           — Phase 1, 2, 11
frontend/src/routes/dashboard/analytics.tsx            — Phase 3
frontend/src/routes/dashboard/{messages,help,settings} — Phase 12
frontend/src/components/ui/error-card.tsx              — Phase 2 (new)
frontend/src/components/ui/empty-state.tsx             — Phase 2 (new)
frontend/src/lib/utils/date.ts                         — Phase 11 (new or extend)
frontend/src/lib/config/chart-colors.ts                — Phase 11 (new)
frontend/vite.config.ts                                — Phase 9 (PWA)
frontend/public/icon-192.png, icon-512.png             — Phase 9 (new)
backend/src/error.rs                                   — Phase 4 (new)
backend/src/main.rs                                    — Phase 4, 7
backend/src/domain/auth/handler.rs                     — Phase 4, 6
backend/src/domain/auth/middleware.rs                  — Phase 4
backend/src/domain/transfers/handler.rs                — Phase 4, 5, 6
backend/src/domain/transactions/handler.rs             — Phase 4, 6, 7
backend/src/domain/accounts/handler.rs                 — Phase 4, 6
backend/src/domain/invoices/handler.rs                 — Phase 6
migrations/XXXX_add_ledger_entries.sql                 — Phase 5 (new)
migrations/XXXX_add_audit_log.sql                      — Phase 5 (new)
migrations/XXXX_alter_precision_and_softdelete.sql     — Phase 5 (new)
Cargo.toml                                             — Phase 6, 7
```

---

## Order of execution

```
[ ] Phase 1.4  — Replace hardcoded data (data integrity bug first)
[ ] Phase 1.1  — Wire "View all" links
[ ] Phase 1.2  — Receive button
[ ] Phase 1.3  — More dropdown
[ ] Phase 2.1  — Error cards
[ ] Phase 2.2  — Empty states
[ ] Phase 3    — Analytics page
[ ] Phase 4.1  — AppError type + fix error leaks
[ ] Phase 4.2  — JWT_SECRET panic fix
[ ] Phase 4.3  — Role parse fix
[ ] Phase 4.4  — CORS audit + lock down
[ ] Phase 4.5  — Rate limiting
[ ] Phase 5.1  — Ledger entries table + double-entry
[ ] Phase 5.2  — Balance as derived value
[ ] Phase 5.3  — Balance history view
[ ] Phase 5.4  — Audit trail
[ ] Phase 5.5  — Idempotency keys
[ ] Phase 5.6  — Soft-delete consistency
[ ] Phase 5.7  — Amount precision migration
[ ] Phase 6    — Backend input validation
[ ] Phase 7    — Structured logging (tracing)
[ ] Phase 8    — Tests
[ ] Phase 9    — PWA config
[ ] Phase 10   — Accessibility (axe-core audit + fixes)
[ ] Phase 11   — Code cleanup
[ ] Phase 12   — Stub pages
```
