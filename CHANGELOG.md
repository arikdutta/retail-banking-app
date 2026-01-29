# Changelog

## 2026-05-27

### Rust Finance Banking UI — Desktop Pages
**Wallets, Transactions, Account Details** (`8c84eb8`)

- `/dashboard/wallets` — card list (2 cards), quick links bar, stats row (last 30d / total spent / cashback), bar chart with Money In/Out toggle, currency table (USD/EUR/GBP), conversion widget
- `/dashboard/transactions` — searchable transaction table, click row → slide-in payment detail panel with mini bar chart
- `/dashboard/settings` — account details: profile completion card, tab nav (Personal Info / Direct Debits / Scheduled Transfer / Security / Privacy), personal info form with view/edit toggle
- Removed Messages from sidebar nav (not needed)
- All pages fully hardcoded mock data (no backend)

---

### Rust Finance Banking UI — Shell & Dashboard
**shadcn sidebar + dashboard page** (`d38bf58`)

- Replaced generic admin shell with Rust Finance banking sidebar nav:
  - Main: Dashboard, Invoices, My Wallets, Activity (collapsible → Transactions / Recipients)
  - Bottom: Analytics, Get Help, Settings
  - Logo: "Rust Finance." brand mark
- `/dashboard` full page: promo banner, stat cards (3), Money Flow line chart (Recharts), recent transactions list, saving progress bars, statistics donut, wallet card, action buttons (Send/Receive/Invoicing/More), quick transfer form, recent activity feed
- `/` and `/account/*` now redirect to `/dashboard` (standard SaaS pattern — no separate home page)
- Added `.npmrc` with `link-workspace-packages=true` (fixes `vite: command not found` in pnpm workspace)
- Stub routes created for all nav sections

---

### Spec Screenshots
**Renamed** (`36afb40`)

- Renamed 8 `CleanShot` timestamp files to semantic names:
  `desktop-dashboard-cashback.png`, `desktop-dashboard-stats.png`, `desktop-wallet.png`, `desktop-transactions.png`, `desktop-account-details.png`, `mobile-responsive-overview.png`, `mobile-dashboard.png`, `mobile-transactions.png`

---

## Stack

- **Frontend**: React 19 + TanStack Router + TanStack Query + Vite + Tailwind v4 + shadcn/ui
- **Charts**: Recharts
- **Backend**: Axum (Rust) — auth only for now, dashboard data is all hardcoded
- **Design reference**: Rust Finance UI (`spec/` folder)
