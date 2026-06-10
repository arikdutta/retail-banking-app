# Plan: Dynamic Banking Data Backend

## Current Situation

The app was bootstrapped from a template. The frontend dashboard displays banking data (transactions, accounts, savings, charts) by fetching **static JSON files** from `frontend/public/data/`:

| File | What it feeds |
|------|--------------|
| `recent-transactions.json` | Transactions list page |
| `recent-activity.json` | Dashboard activity feed |
| `stat-cards.json` | Account balance cards |
| `savings.json` | Savings goals progress |
| `money-flow.json` | Income/expenses chart |
| `donut-stats.json` | Spending breakdown donut |

The database has only 3 tables: `users`, `bugreports`, `roleaccesses`. No banking tables exist. Nothing is dynamic — no data is user-specific, nothing is persisted, nothing can be created or modified.

---

## What Needs to Be Built

### Step 1 — Migrations

Three new tables. Follow existing conventions in the codebase (look at `0001_create_users.sql` and `0003_create_roleaccesses.sql` for patterns).

**Tables to create:**
- `accounts` — linked to a user, holds balance and account metadata
- `transactions` — linked to an account, one row per operation (debit or credit)
- `savings_goals` — linked to a user, tracks progress toward a target amount

Each migration should include seed data for the demo user (`00000000-0000-4000-8000-100000000004`) so the dashboard is not empty on first run.

The current JSON files in `frontend/public/data/` show exactly what fields the frontend expects — use them as reference for what columns matter.

`money-flow` and `donut-stats` are **not stored** — they are SQL aggregations over `transactions` (GROUP BY date/category). No extra table needed.

---

### Step 2 — Rust Structs + SQLx Queries

For each table: one `struct` mapping the DB row (derives `sqlx::FromRow`), one `struct` for the API response (derives `serde::Serialize`, optionally `ts_rs::TS` for frontend type generation).

Queries in dedicated files, one per domain:
- `src/queries/accounts.rs`
- `src/queries/transactions.rs`
- `src/queries/savings_goals.rs`

---

### Step 3 — Axum Routes

New route modules under `src/routes/`:

```
GET  /api/accounts                  → list accounts for authenticated user
GET  /api/accounts/:id              → single account

GET  /api/transactions              → list transactions (paginated, filterable by account_unid)
GET  /api/transactions/activity     → recent activity feed (last N across all accounts)

GET  /api/savings                   → list savings goals for authenticated user

GET  /api/dashboard/money-flow      → income vs expenses per day (last 7 days)
GET  /api/dashboard/donut-stats     → spending breakdown by category
```

All routes protected (require valid session — same auth middleware as existing routes).

---

### Step 4 — `requests.http`

Add one section per domain to `requests.http` so every endpoint can be tested manually. Pattern: login first, then call protected endpoints using the session cookie.

---

### Step 5 — Frontend Swap

Replace each `fetch('/data/xxx.json')` with the corresponding `fetch('/api/...')`. No frontend restructuring — swap the URL, adjust field names if needed.

---

## Suggested Table Structure

Based on the banking domain and what the frontend consumes. These are suggestions — adapt as needed.

```
customers          first_name, last_name, email, phone_number, address, date_of_birth
                   → separate from `users` (auth concern) — linked via user_unid FK
                   → one customer profile per user

accounts           customer_id FK, account_number, account_type, balance, created_at
                   → a customer can have multiple accounts (checking, savings, investment)

transactions       account_id FK, transaction_type, amount, transaction_date, description
                   → one row per operation, amount signed (negative = debit)

loans              customer_id FK, loan_type, amount, interest_rate, start_date, end_date
                   → optional for now, feeds a "loans" dashboard section later

card_transactions  card_id FK, transaction_date, amount, merchant_name, location
                   → card-level granularity, separate from account transactions

notifications      type, status, data, date
                   → user-facing alerts (payment due, low balance, transfer received)
```

> **`customers` vs `users`**: `users` handles auth (email, password, session). `customers` holds the banking profile (name, address, DOB). Keep them separate — clean boundary between auth layer and domain layer. Link with `user_unid FK`.

> **`money-flow` / `donut-stats`**: not stored, computed via SQL aggregations on `transactions`.

---

## Delivery Order

```
1. Migrations (0004, 0005, 0006) + seed data
2. Rust structs + SQLx queries  (accounts → transactions → savings → aggregations)
3. Axum route handlers
4. requests.http entries
5. Frontend fetch swap
```

Each step is independently testable before moving to the next.
