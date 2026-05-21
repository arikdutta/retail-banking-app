# chmod +x rerun_migrations.sh

set -e

set -a; source backend/.env; set +a

echo "Clearing _sqlx_migrations table..."
psql "$DATABASE_URL" -c "DELETE FROM _sqlx_migrations WHERE version > 0;"

echo "Running migrations..."
sqlx migrate run --source migrations

echo "Done ✔️"
