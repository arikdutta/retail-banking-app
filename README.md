# Retail Banking App (Rust + TS)

Retail banking app built with async Rust (Axum + Tokio) + TypeScript (TanStack Start). Features accounts, transfers, transactions, invoices, savings goals, role-based access control, and PDF generation.
<img width="956" height="451" alt="rust_finance_compressed" src="https://github.com/user-attachments/assets/7cdffd59-53a6-4390-96bd-9c27e208a888" />

## Run the project

```bash
reset_db.sh # Setup DB and .sqlx in backend/

pnpm install
pnpm dev        # Web
pnpm desktop    # Desktop
pnpm ios        # iOS
pnpm android    # Android
```

## Test accounts

| Email                  | Password   | Role          |
|------------------------|------------|---------------|
| `root@example.com`     | `password` | Root          |
| `admin@example.com`    | `password` | Admin         |
| `user@example.com`     | `password` | RegularUser   |
| `demo@scalenza.com`    | `password` | Demo          |


## TypeScript Bindings

`frontend/bindings/` is auto-generated from Rust structs annotated with `#[derive(TS)]` (via `ts-rs`).
Run `cargo test` in `backend/` to regenerate — types stay in sync with the backend at compile time.

## Troubleshooting

### iOS

If `pnpm ios` does not work, do this:

```bash
# First terminal
pnpm dev

# Second terminal
cd src-tauri
cargo tauri ios init
cargo tauri ios dev
# └─> Follow instructions, if any.
```

It will take quite a while the first time, that's normal. After the first time, `pnpm ios` should work as expected.
