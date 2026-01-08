# Fullstack Auth App (Rust + TS)

Fullstack app using Rust (Axum) + TS (Tanstack start)

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