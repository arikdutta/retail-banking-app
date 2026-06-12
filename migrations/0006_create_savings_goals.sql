CREATE TABLE IF NOT EXISTS savings_goals (
    unid           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unid      UUID          NOT NULL,
    name           TEXT          NOT NULL,
    current_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    target_amount  NUMERIC(15,2) NOT NULL,
    currency       TEXT          NOT NULL DEFAULT 'USD',
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    FOREIGN KEY (user_unid) REFERENCES users (unid)
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_unid ON savings_goals USING btree (user_unid);

CREATE TRIGGER savings_goals_set_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
