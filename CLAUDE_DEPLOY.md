# Deploy — GitHub Actions Setup

## Secrets

| Key | Value |
|-----|-------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password / access token |
| `SSH_PRIVATE_KEY` | Private key matching the public key on the server |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DATABASE` | `retail_banking_app` |
| `JWT_SECRET` | Random secret for JWT signing |

## Variables

| Key | Value |
|-----|-------|
| `SERVER_IP` | IP of the prod server |
| `DOCKER_REPOSITORY` | Docker Hub repo name (e.g. `retail-banking-app`) |
| `VITE_API_URL` | Public API URL injected at frontend build time (e.g. `https://api.yourdomain.com`) |
| `CORS_ORIGINS` | Allowed origins for backend CORS (e.g. `https://yourdomain.com`) |

## Workflows

```bash
# Full deploy (build + push + deploy)
gh workflow run prod.yml

# Redeploy current images without rebuilding
gh workflow run prod.yml -f skip_build=true

# Fix broken migration in prod
gh workflow run fix-migration.yml -f operation=delete -f version=20260516000009
gh workflow run fix-migration.yml -f operation=fix_checksum -f version=20260516000007

# Dry run (inspect row, no changes)
gh workflow run fix-migration.yml -f operation=delete -f version=20260516000009 -f dry_run=true
```
