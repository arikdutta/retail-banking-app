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

### 1.4 Replace hardcoded data — page-dashboard.tsx

| Line | Current value | Fix |
|------|--------------|-----|
| 225 | `$24,098.00` balance | Pull from `GET /api/accounts` → `account.balance` |
| 227 | `VISA` card brand | Pull from `account.account_type` (no card_brand field — see 1.5.2) |
| 230 | `"Rust Finance."` | App config constant or user profile label |
| 118 | `"Jan 10 – Jan 16"` | Compute from selected date range state |

### 1.5 Replace hardcoded data — page-wallets.tsx

**File:** `frontend/domain/dashboard/page-wallets.tsx` — entirely mock data, nothing wired to backend.

#### 1.5.1 `barData` (lines 36–44) — money in/out chart → already has backend

```ts
// BEFORE: 7 hardcoded entries
// AFTER: useQuery → GET /api/dashboard/money-flow  (endpoint exists, just unused in frontend)
```

#### 1.5.2 `cards[]` — card list with balance/brand

Pull from `GET /api/accounts`. Account model has `balance`, `currency`, `account_type`, `label` — no `card_brand`. Options:
- Map `account_type` to card label (checking → VISA, savings → Mastercard)
- Add `card_brand VARCHAR` column to `accounts` migration (cleaner)

#### 1.5.3 `statsRow[]` — last 30 days aggregate stats

Hardcoded: 56 transactions, $10,654 spent, $2,456 cashback.

Needs new backend endpoint: `GET /api/dashboard/stats?days=30`

```sql
SELECT
  COUNT(*) FILTER (WHERE direction = 'debit') AS tx_count,
  SUM(amount) FILTER (WHERE direction = 'debit') AS total_spent,
  SUM(amount) FILTER (WHERE direction = 'credit') AS total_received
FROM transactions
WHERE user_unid = $1 AND created_at >= NOW() - INTERVAL '30 days'
```

#### 1.5.4 `currencies[]` — multi-currency balances

Hardcoded USD/EUR/GBP. Group `GET /api/accounts` response by `currency`, sum balances per currency. No new endpoint needed.

#### 1.5.5 "↑ 2.05% February 05, 2022" (line 103) — hardcoded trend %

Derive on frontend from `money-flow` data once live: compare current 7-day total vs previous 7-day.
```tsx
// Removed from the code with the new code changes />
```

### 1.6 Replace hardcoded data — page-account-details.tsx

**File:** `frontend/domain/dashboard/page-account-details.tsx:130`

```tsx
// BEFORE: <Field label="Date of birth" value="29th March 1996" />
// AFTER: pull from user profile API
```

`date_of_birth` missing from schema. Requires:
1. Migration: `ALTER TABLE users ADD COLUMN date_of_birth DATE;`
2. Update user GET/PUT endpoints to include field
3. Wire to field component

### 1.7 Send Money form — currency, validation, UX

**File:** `frontend/components/send-money-modal.tsx` (or equivalent transfer modal)

#### Amount field
- Add currency prefix (e.g. `€`) as inset adornment — pull currency from selected account
- Enforce 2 decimal places on blur (format `444` → `444.00`)
- Min validation: `> 0.00`
- Max validation: `≤ account balance` — show inline error "Insufficient funds"
- Use `type="number"` with `step="0.01"` or controlled mask

#### IBAN field
- Validate checksum on blur (standard mod-97 algorithm)
- Auto-format as user types: insert space every 4 chars (`GB29 NWKB 6016...`)
- Show country flag or bank name hint if identifiable from prefix
- **Make field required** — remove "(optional)" label
- Inline error: "Invalid IBAN"

#### Recipient Name
- Min length: 2 chars
- Trim and reject whitespace-only input
- Inline error: "Name required"

#### From Account dropdown
- Show balance next to account name in each option: `Current (€2,450.00)`
- Show currency symbol from selected account — drives Amount field prefix

#### Send button — confirmation + loading
- On first click: show confirmation dialog ("Send €444.00 to Jane Smith?")
- After confirm: disable button + show spinner
- Re-enable on error response

#### Zod schema additions
```ts
const sendMoneySchema = z.object({
  fromAccountId: z.string().uuid(),
  recipientName: z.string().min(2).trim(),
  iban: z.string().min(15).refine(validateIban, "Invalid IBAN"),
  amount: z.number().positive().multipleOf(0.01),
  description: z.string().optional(),
})
```

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

### 4.4 Cookie secure flag (later)

`auth/handler.rs:105` — secure flag gated on `NODE_ENV=production`. Fine for dev, but document this explicitly.


### 4.5 Rate limiting (later)

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

### 5.4 Audit trail (later)

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


### 5.6 Soft-delete consistency (later)

Add `deleted_at TIMESTAMPTZ` to: `accounts`, `transactions`, `recipients`.
Already on `users`. Inconsistency is a smell.

### 5.7 Amount precision

`NUMERIC(15,2)` → `NUMERIC(19,4)`. 2 decimal places = USD fine, but 4 = safe for multi-currency (EUR, crypto, etc.).

---

## Phase 6 — Backend Input Validation (⚠️ IMPORTANT)

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

### 7.4 Fix missing backend logs for business errors ← ROOT CAUSE of "account not found" invisible

`accounts/handler.rs:38` returns 404 with **no tracing call**. Same pattern across all domain handlers.

```rust
// BEFORE (silent 404):
Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response(),

// AFTER:
Ok(None) => {
    tracing::warn!(account_id = %id, user = %user.unid, "account not found");
    (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response()
}
```

Apply to ALL handlers: `accounts/handler.rs`, `transactions/handler.rs`, `transfers/handler.rs`, `recipients/handler.rs`, `invoices/handler.rs`. Also log 403 Forbidden.

### 7.5 Fix silent failure in frontend error reporter

`error-reporter.ts:52` — `.catch(() => {})` swallows all failed POST calls. If URL wrong or CORS blocked, zero visibility.

```ts
// AFTER:
.catch((e) => console.error("[error-reporter] failed:", e));
```

Also verify `VITE_API_URL` is correct in all environments (dev/prod).

### 7.6 Fix: component onError handlers don't call report()

`page-invoices.tsx:207,224,439`, `send-money-modal.tsx:100,135`, `page-recipients.tsx:68,153` — all call `toast.error()` only. Global `MutationCache.onError` may not fire when local `onError` is set (React Query v5 behavior).

```ts
onError: (err) => {
  toast.error(err.message);
  report({ bugType: BUG_TYPE.Server, message: err.message, stackTrace: err.stack });
},
```

### 7.7 Backend self-reporting errors to bugreports table

Backend `tracing::error!()` calls are invisible in the admin bug report UI — only in server logs. Two options:

#### Option A — Custom tracing Layer (recommended)

Implement a `tracing_subscriber::Layer` that intercepts every `ERROR`-level event and inserts to `bugreports` automatically. Zero handler changes needed.

```rust
// backend/src/tracing_bugreport_layer.rs
use tracing_subscriber::Layer;

pub struct BugReportLayer { pub pool: sqlx::PgPool }

impl<S: tracing::Subscriber> Layer<S> for BugReportLayer {
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: tracing_subscriber::layer::Context<'_, S>) {
        if *event.metadata().level() != tracing::Level::ERROR { return; }
        let mut visitor = MessageVisitor::default();
        event.record(&mut visitor);
        let pool = self.pool.clone();
        let msg = visitor.message;
        tokio::spawn(async move {
            let _ = sqlx::query!(
                "INSERT INTO bugreports (bug_type, message, application)
                 VALUES ('Server', $1, 'backend')",
                msg
            )
            .execute(&pool)
            .await;
        });
    }
}
```

Register in `main.rs`:
```rust
tracing_subscriber::registry()
    .with(fmt_layer)                          // console/JSON output
    .with(BugReportLayer { pool: pool.clone() }) // auto DB insert
    .init();
```

**Result:** Every existing and future `tracing::error!()` call auto-saves to bugreports. No per-handler changes needed.

#### Option B — Manual helper (simpler, incomplete)

```rust
// backend/src/domain/bugreports/db.rs
pub async fn insert_server_error(pool: &PgPool, message: &str) {
    let _ = sqlx::query!(
        "INSERT INTO bugreports (bug_type, message, application)
         VALUES ('Server', $1, 'backend')",
        message
    )
    .execute(pool)
    .await;
}
```

Must be called manually in every `Err(e)` arm — easy to miss in new handlers.

**Use Option A.** Tracing Layer is the right abstraction: one registration captures all current and future error paths.

### 7.8 Expand BugType for better error classification

Current: `NetworkError` catches everything. Need finer types:

| New type | When to use |
|----------|-------------|
| `NotFound` | 404 from any API endpoint |
| `AuthError` | 401/403 responses |
| `ApiError` | non-200, non-404 API responses |

Add to `BugType` Rust enum → re-run ts-rs codegen → update `frontend/lib/bug-type.ts`.

Update `query-client.ts` to parse HTTP status from error and pick correct `BugType` instead of always `NetworkError`.

---

## Phase 8 — Tests

**Test file:** `backend/tests/integration.rs`
**Framework:** `#[sqlx::test]` — isolated DB per test, migrations auto-applied.
**Helpers already in place:** `make_app()`, `get_session_cookie()`, `body_json()`, seeded users (`root@`, `admin@`, `user@`), `SEEDED_ACCOUNT_UNID`.

Notation: ✅ exists · ❌ missing

---

### 8.1 Auth

| Test | | Verify |
|------|-|--------|
| `login_valid_credentials_sets_cookie` | ✅ | — |
| `login_wrong_password_returns_401` | ✅ | — |
| `login_unknown_user_returns_401` | ✅ | — |
| `protected_routes_return_401_without_cookie` | ✅ | — |
| `me_returns_authenticated_user` | ✅ | — |
| `logout_clears_session_cookie` | ✅ | POST /api/auth/logout → cookie cleared; subsequent GET /api/auth/me → 401 |
| `admin_only_routes_reject_regular_user` | ✅ | user@ hitting admin routes → 403 |

---

### 8.2 Accounts

| Test | | Verify |
|------|-|--------|
| `list_accounts_returns_array` | ✅ | — |
| `get_account_returns_200_for_owner` | ✅ | — |
| `get_account_returns_forbidden_for_other_user` | ✅ | — |
| `get_account_returns_404_for_nonexistent` | ✅ | Random UUID → 404 (validates 7.4 tracing::warn path) |
| `list_accounts_isolates_by_user` | ✅ | root@'s accounts absent from user@'s list |

---

### 8.3 Transactions

| Test | | Verify |
|------|-|--------|
| `list_transactions_returns_paginated_json` | ✅ | — |
| `recent_activity_returns_array` | ✅ | — |
| `email_statement_returns_500_when_resend_key_missing` | ✅ | — |
| `list_transactions_filtered_by_account` | ✅ | `?account_unid=SEEDED` → all rows belong to that account |
| `list_transactions_per_page_clamped` | ✅ | `?per_page=999` → response per_page ≤ 100 |
| `pdf_download_returns_pdf_content_type` | ✅ | GET /api/transactions/pdf?from=...&to=... → content-type: application/pdf |
| `transactions_isolates_by_user` | ✅ | root@'s transactions not visible to user@ |

---

### 8.4 Transfers  ← highest risk, all missing

| Test | | Verify |
|------|-|--------|
| `create_transfer_happy_path` | ✅  | Valid transfer → 201; source balance decremented |
| `create_transfer_insufficient_funds_returns_422` | ✅  | amount > balance → 422; balance unchanged |
| `create_transfer_from_other_users_account_returns_403` | ✅  | User A cannot debit User B's account |
| `create_transfer_amount_zero_returns_422` | ✅  | `amount: 0` → 422 (after Phase 6) |
| `transfer_idempotency_prevents_duplicate` | ✅ | Same idempotency key twice → balance deducted once (after Phase 5.5) |
| `concurrent_transfers_no_double_debit` | ✅ | Two simultaneous transfers where only one can succeed → exactly one 201 |

```rust
// concurrent pattern:
let (r1, r2) = tokio::join!(transfer(pool.clone(), ...), transfer(pool.clone(), ...));
let ok_count = [r1.status(), r2.status()].iter().filter(|s| s.is_success()).count();
assert_eq!(ok_count, 1);
```

---

### 8.5 Recipients

| Test | | Verify |
|------|-|--------|
| `list_recipients_returns_array` | ✅ | GET /api/recipients → 200, `data` array (paginated) |
| `create_recipient_returns_201` | ✅ | POST valid body → 201, `unid` in response |
| `delete_own_recipient_returns_204` | ✅ | Owner deletes → 204 (NO_CONTENT) |
| `delete_other_users_recipient_returns_404` | ✅ | Cross-user delete → 404 (DB filters by user_unid, no 403 path) |

---

### 8.6 Invoices  ← all missing

| Test | | Verify |
|------|-|--------|
| `list_invoices_returns_paginated_json` | ✅ | GET /api/invoices → `{ data, page, total }` |
| `create_invoice_returns_201` | ✅ | POST valid body → 201, `unid` in response |
| `update_invoice_status_valid_transition` | ✅ | pending → paid → 200 |
| `update_invoice_status_invalid_returns_422` | ✅ | paid → pending → 422 (if transitions enforced) |
| `invoices_isolates_by_user` | ✅ | user@ cannot see root@'s invoices |

---

### 8.7 Savings goals

| Test | | Verify |
|------|-|--------|
| `list_savings_goals_returns_array` | ✅ | — |
| `create_savings_goal_returns_201` | ✅ | POST valid body → 201 |
| `update_savings_goal_progress` | ✅ | PATCH → updated `current_amount` in subsequent GET |
| `delete_savings_goal` | ✅ | DELETE own → 200; goal absent from list |
| `delete_other_users_goal_returns_403` | ✅ | Cross-user delete → 403 |

---

### 8.8 Bug reports

| Test | | Verify |
|------|-|--------|
| `create_bug_report_is_public` | ✅ | — |
| `list_bug_reports_requires_auth` | ✅ | — |
| `list_bug_reports_returns_data_for_admin` | ✅ | — |
| `list_bug_reports_filtered_by_type` | ✅ | `?bug_type=Bug` → all rows have `bugtype = "Bug"` |
| `list_bug_reports_filtered_by_search` | ✅ | `?search=xyz` → only matching rows |
| `delete_all_bug_reports_clears_table` | ✅ | DELETE → 200; list returns empty `data` |
| `bug_report_charts_returns_array` | ✅ | GET /api/bugreports/charts?days=30 → 200, array |

---

### 8.9 Dashboard

| Test | | Verify |
|------|-|--------|
| `dashboard_money_flow_returns_array` | ✅ | — |
| `dashboard_donut_stats_returns_array` | ✅ | — |
| `dashboard_money_flow_shape` | ✅ | Each item has `date`, `money_in`, `money_out` fields |
| `dashboard_donut_stats_shape` | ✅ | Each item has `label`, `value` fields |
| `dashboard_stats_returns_correct_shape` | ✅ | GET /api/dashboard/stats → `{ tx_count, total_spent, total_received }` (new endpoint, Phase 1.5.3) |

---

### 8.10 Role accesses

| Test | | Verify |
|------|-|--------|
| `my_roles_returns_array` | ✅ | — |
| `regular_user_cannot_list_all_roles` | ✅ | user@ → 403 |
| `admin_can_list_all_roles` | ✅ | admin@ → 200 |

---

### 8.11 Input validation (implement after Phase 6)

| Test | | Verify |
|------|-|--------|
| `login_empty_email_returns_422` |  ✅  | `{ email: "", password: "x" }` → 422 |
| `transfer_amount_zero_returns_422` |  ✅  | `{ amount: 0, ... }` → 422 |
| `transfer_amount_negative_returns_422` |  ✅  | `{ amount: -1, ... }` → 422 |
| `transfer_iban_too_short_returns_422` |  ✅  | `{ recipient_iban: "GB" }` → 422 |
| `invoice_missing_required_field_returns_422` |  ✅  | empty body → 422 |

---

### 8.12 Ledger consistency (implement after Phase 5)

| Test | | Verify |
|------|-|--------|
| `transfer_creates_two_ledger_entries` | ✅ | One transfer → DEBIT on source + CREDIT on dest in `ledger_entries` |
| `account_balance_matches_ledger_sum` | ✅ | `balance = SUM(credits) - SUM(debits)` reconciles after N transfers |

---

### 8.13 Frontend tests (Vitest, already in deps)

| Test | File |
|------|------|
| `useMoneyFlow()` maps API response to `{ date, moneyIn, moneyOut }` | `hooks/useMoneyFlow.test.ts` | ✅
| Zod schema rejects `amount: 0` | `send-money-schema.test.ts` |✅
| Zod schema rejects IBAN shorter than 15 chars | `send-money-schema.test.ts` |✅
| `fmtDate()` formats ISO string correctly | `lib/utils/date.test.ts` |✅
| `fingerprint()` dedupes identical error events | `lib/error-reporter.test.ts` |✅

---

## Phase 9 — PWA (later)

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

## Phase 10 — Accessibility (later)

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

## Phase 11 — Code Cleanup (later)

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

## Phase 12 — Stub Pages (later)

Low priority. After phases 1-10.

- **Messages:** Static FAQ or contact form. No backend needed.
- **Help:** Keyboard shortcuts, docs links, support email.
- **Settings:** Theme toggle (dark/light already in stack), language, notification prefs.

---

## File Impact Summary

```
frontend/domain/dashboard/page-dashboard.tsx           — Phase 1.4, 2, 11
frontend/domain/dashboard/page-wallets.tsx             — Phase 1.5 (all mock data → API)
frontend/domain/dashboard/page-account-details.tsx     — Phase 1.6 (DOB field)
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
[ ] Phase 1.4  — Replace hardcoded data in page-dashboard.tsx (balance, card brand, date range) ✅
[ ] Phase 1.5.1 — Wire page-wallets.tsx barData → GET /api/dashboard/money-flow (endpoint exists)✅
[ ] Phase 1.5.2 — Wire page-wallets.tsx cards[] → GET /api/accounts (add card_brand migration if needed)✅
[ ] Phase 1.5.3 — New endpoint GET /api/dashboard/stats + wire statsRow in page-wallets.tsx✅
[ ] Phase 1.5.4 — Wire currencies[] in page-wallets.tsx from accounts grouped by currency✅
[ ] Phase 1.5.5 — Derive trend % from live money-flow data (replace "↑ 2.05% Feb 05 2022") (Not needed anymore)❌
[ ] Phase 1.6  — Add date_of_birth to users table + wire page-account-details.tsx ✅
[ ] Phase 1.7  — Send Money form (currency, IBAN validation, confirmation dialog)✅
[ ] Phase 1.1  — Wire "View all" links ✅ 
[ ] Phase 1.2  — Receive button✅
[ ] Phase 1.3  — More dropdown✅
[ ] Phase 2.1  — Error cards✅
[ ] Phase 2.2  — Empty states ✅
[ ] Phase 3    — Analytics page ✅
[ ] Phase 4.1  — AppError type + fix error leaks ✅
[ ] Phase 4.2  — JWT_SECRET panic fix ✅
[ ] Phase 4.3  — Role parse fix ✅
[ ] Phase 4.4  — CORS audit + lock down
[ ] Phase 4.5  — Rate limiting
[ ] Phase 5.1  — Ledger entries table + double-entry ✅
[ ] Phase 5.2  — Balance as derived value ✅
[ ] Phase 5.3  — Balance history view✅
[ ] Phase 5.4  — Audit trail
[ ] Phase 5.5  — Idempotency keys
[ ] Phase 5.6  — Soft-delete consistency
[ ] Phase 5.7  — Amount precision migration
[ ] Phase 6    — Backend input validation✅
[ ] Phase 7.1-7.3 — Structured logging (tracing setup)✅
[ ] Phase 7.4  — Add tracing::warn to all 404/403 handler branches✅
[ ] Phase 7.5  — Fix silent .catch(() => {}) in error-reporter.ts✅
[ ] Phase 7.6  — Add report() to all component onError callbacks✅
[ ] Phase 7.7  — Backend self-reporting to bugreports table✅
[ ] Phase 7.8  — Expand BugType (NotFound, AuthError, ApiError) + update query-client.ts✅
[ ] Phase 8.1  — Auth tests (logout, admin-only rejection)✅
[ ] Phase 8.2  — Accounts tests (404 nonexistent, isolation)✅
[ ] Phase 8.3  — Transactions tests (filter, pagination, PDF, isolation)✅
[ ] Phase 8.4  — Transfers tests (happy path, insufficient funds, 403, concurrent) ← HIGHEST PRIORITY✅
[ ] Phase 8.5  — Recipients tests (CRUD, isolation)✅
[ ] Phase 8.6  — Invoices tests (CRUD, status transitions, isolation)✅
[ ] Phase 8.7  — Savings goals tests (CRUD, isolation)✅
[ ] Phase 8.8  — Bug reports tests (filters, delete, charts)✅
[ ] Phase 8.9  — Dashboard tests (shape validation, new stats endpoint)✅
[ ] Phase 8.10 — Role accesses tests (admin vs regular user)✅
[ ] Phase 8.11 — Input validation tests (after Phase 6)✅
[ ] Phase 8.12 — Ledger consistency tests (after Phase 5)✅
[ ] Phase 8.13 — Frontend Vitest tests (hooks, Zod schemas, utils)✅
[ ] Phase 9    — PWA config
[ ] Phase 10   — Accessibility (axe-core audit + fixes)
[ ] Phase 11   — Code cleanup
[ ] Phase 12   — Stub pages
```
