CREATE TABLE IF NOT EXISTS invoices (
    unid            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unid       UUID          NOT NULL REFERENCES users (unid),
    invoice_number  TEXT          NOT NULL,
    recipient_name  TEXT          NOT NULL,
    recipient_email TEXT,
    recipient_iban  TEXT,
    description     TEXT,
    amount          NUMERIC(15,2) NOT NULL,
    currency        TEXT          NOT NULL DEFAULT 'USD',
    status          TEXT          NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date        TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_unid  ON invoices USING btree (user_unid);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices USING btree (status);
