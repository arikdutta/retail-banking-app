#!/bin/bash

# chmod +x reset_db.sh

set -e

if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | sed 's/#.*$//' | xargs)
fi

export PGPASSWORD="$POSTGRES_PASSWORD"
export DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1/$POSTGRES_DATABASE"

echo "Terminating all connections to database: $POSTGRES_DATABASE"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DATABASE';"

echo "Dropping database: $POSTGRES_DATABASE"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DATABASE;"

echo "Creating database: $POSTGRES_DATABASE"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $POSTGRES_DATABASE;"

echo "Running migrations"
sqlx migrate run --source migrations

echo "Regenerating sqlx query cache"
cd backend && cargo sqlx prepare && cd ..

echo "Done ✔️"
