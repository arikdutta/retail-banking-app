# Retail Banking App — Task List

**Stack:** TanStack Router + TanStack Query + React + Axum backend
**Design ref:** Rust Finance UI (see spec screenshots)
**Approach:** Mock data first (weeks 1–3), backend wiring week 4

---

## Week 1 — Layout & Navigation Shell

Goal: sidebar nav + routing skeleton. All pages exist but show placeholders.

- [ ] **1.1** Create sidebar component: logo, nav links (Dashboard, Invoices, Messages, My Wallets, Activity, Analytics), Get Help, Settings
- [ ] **1.2** Create top bar component: search icon, bell notification, user avatar + name dropdown
- [ ] **1.3** Create mobile bottom tab bar: Dashboard, Wallets, Transactions, Account
- [ ] **1.4** Add routes: `/wallets`, `/transactions`, `/invoices`, `/messages` — each with placeholder page
- [ ] **1.5** Wire active route highlight on sidebar nav items
- [ ] **1.6** Wire dark/light toggle (ThemeProvider already exists)
- [ ] **1.7** Responsive layout: sidebar on md+, bottom tabs on mobile

---

## Week 2 — Dashboard Page

Goal: full dashboard with mock data, no real API calls.

- [ ] **2.1** Promo banner (blue gradient, "Unlimited Cashback" CTA)
- [ ] **2.2** Summary stat cards: Business Account, Tax Reserve, Savings — with mini bar chart sparklines
- [ ] **2.3** Money Flow line chart (Income vs Expenses, date range label) — use Recharts
- [ ] **2.4** Wallet card component (blue gradient, balance, VISA logo)
- [ ] **2.5** Wallet action buttons: Send, Receive, Invoicing, More
- [ ] **2.6** Quick Transfer form: recipient selector, amount input, Send Money button
- [ ] **2.7** Recent Transactions list: avatar/icon, name, date, amount, status badge
- [ ] **2.8** Saving section: fund list with progress bars
- [ ] **2.9** Statistics donut chart (Recharts)
- [ ] **2.10** Wire all data via `useQuery` hooks with mock fetchers

---

## Week 3 — Wallets + Transactions Pages

### My Wallets page
- [ ] **3.1** Card list: blue gradient cards with balance + VISA logo, scroll horizontally
- [ ] **3.2** Manage Card button
- [ ] **3.3** Quick Links bar: Deposit, Send, Receive, Invoicing, Checkout
- [ ] **3.4** Stats row: last 30d transactions count, total spent, total cashback
- [ ] **3.5** Statistics toggle bar chart: Money In / Money Out, month selector
- [ ] **3.6** Currency table: USD, EUR, GBP with balances
- [ ] **3.7** Conversion widget: USD → EUR with rate

### Transactions page
- [ ] **3.8** Search bar: "Search for transactions…"
- [ ] **3.9** TanStack Table: Name/Business, Date, Invoice ID, Amount columns — sortable
- [ ] **3.10** Status badge: Success (green), Pending (yellow), Failed (red)
- [ ] **3.11** Row click → slide-in Payment Detail panel: recipient, date, fee, invoice ID, mini bar chart
- [ ] **3.12** Filters button + Export button (UI only, no logic)

---

## Week 4 — Account Profile + Backend Wiring

### Account Details page
- [ ] **4.1** Complete profile progress bar + Verify Identity CTA
- [ ] **4.2** Left tab list: Personal Informations, Direct Debits, Scheduled Transfer, Login & Security, Data Privacy
- [ ] **4.3** Personal Info form: full legal name, DOB, phone, country, city, address, postal code
- [ ] **4.4** Upload picture / Delete picture buttons
- [ ] **4.5** Edit Details button → inline form edit mode
- [ ] **4.6** User dropdown menu: Your details, Account settings, Log out, Dark mode toggle

### Backend wiring
- [ ] **4.7** Replace mock fetchers with real Axum API calls
- [ ] **4.8** TanStack Query: proper loading skeletons + error states on all pages
- [ ] **4.9** Transactions page: wire real paginated data, search filter hits backend
- [ ] **4.10** Account page: wire profile fetch + update mutation
