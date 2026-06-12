-- Seed fake data for accounts, transactions, and savings_goals.
-- All rows reference user 00000000-0000-4000-8000-100000000004 (existing test user).

-- ── accounts ────────────────────────────────────────────────────────────────

INSERT INTO accounts (unid, user_unid, label, account_type, balance, currency) VALUES
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000004', 'Personal Checking',     'checking',   3450.75, 'USD'),
    ('b1c2d3e4-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000004', 'Emergency Fund',        'savings',    8200.00, 'USD'),
    ('c2d3e4f5-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000004', 'Investment Portfolio',  'investment', 15750.00, 'USD'),
    ('d3e4f5a6-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000004', 'Freelance Business',    'business',   6340.50, 'USD')
ON CONFLICT (unid) DO NOTHING;


-- ── transactions ─────────────────────────────────────────────────────────────
-- Spread across the four accounts seeded above.

INSERT INTO transactions (unid, account_unid, description, category, amount, currency, status, created_at) VALUES
    -- Personal Checking
    ('10a1b2c3-d4e5-6789-abcd-f01234567890', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Rent payment',          'housing',        -1800.00, 'USD', 'completed', '2024-02-01T09:00:00Z'),
    ('11b2c3d4-e5f6-7890-bcde-012345678901', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Whole Foods',           'groceries',        -134.52, 'USD', 'completed', '2024-02-03T17:45:00Z'),
    ('12c3d4e5-f6a7-8901-cdef-123456789012', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Netflix',               'subscription',      -15.99, 'USD', 'completed', '2024-02-05T00:00:00Z'),
    ('13d4e5f6-a7b8-9012-defa-234567890123', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Salary deposit',        'deposit',        3500.00, 'USD', 'completed', '2024-02-15T08:00:00Z'),
    ('14e5f6a7-b8c9-0123-efab-345678901234', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Electric bill',         'utilities',        -98.40, 'USD', 'completed', '2024-02-18T12:30:00Z'),
    ('15f6a7b8-c9d0-1234-fabc-456789012345', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Gym membership',        'health',           -49.00, 'USD', 'completed', '2024-02-20T07:00:00Z'),
    ('16a7b8c9-d0e1-2345-abcd-567890123456', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789', 'Transfer to savings',   'transfer',        -200.00, 'USD', 'completed', '2024-02-22T10:00:00Z'),

    -- Emergency Fund (savings account)
    ('20b8c9d0-e1f2-3456-bcde-678901234567', 'b1c2d3e4-f5a6-7890-bcde-f01234567890', 'Transfer from checking','deposit',         200.00, 'USD', 'completed', '2024-02-22T10:01:00Z'),
    ('21c9d0e1-f2a3-4567-cdef-789012345678', 'b1c2d3e4-f5a6-7890-bcde-f01234567890', 'Interest earned',       'interest',          18.45, 'USD', 'completed', '2024-02-28T23:59:00Z'),

    -- Investment Portfolio
    ('30d0e1f2-a3b4-5678-defa-890123456789', 'c2d3e4f5-a6b7-8901-cdef-012345678901', 'S&P 500 ETF purchase',  'investment',     -2500.00, 'USD', 'completed', '2024-02-02T10:15:00Z'),
    ('31e1f2a3-b4c5-6789-efab-901234567890', 'c2d3e4f5-a6b7-8901-cdef-012345678901', 'Dividend payout',       'dividend',         125.30, 'USD', 'completed', '2024-02-14T09:00:00Z'),
    ('32f2a3b4-c5d6-7890-fabc-012345678901', 'c2d3e4f5-a6b7-8901-cdef-012345678901', 'Tech stock sale',       'investment',      1800.00, 'USD', 'completed', '2024-02-21T14:20:00Z'),
    ('33a3b4c5-d6e7-8901-abcd-123456789012', 'c2d3e4f5-a6b7-8901-cdef-012345678901', 'Bond purchase',         'investment',      -950.00, 'USD', 'pending',   '2024-02-25T11:00:00Z'),

    -- Freelance Business
    ('40b4c5d6-e7f8-9012-bcde-234567890123', 'd3e4f5a6-b7c8-9012-defa-123456789012', 'Client invoice #1042',  'freelance',      4200.00, 'USD', 'completed', '2024-02-07T16:00:00Z'),
    ('41c5d6e7-f8a9-0123-cdef-345678901234', 'd3e4f5a6-b7c8-9012-defa-123456789012', 'Adobe CC',              'subscription',    -54.99, 'USD', 'completed', '2024-02-10T00:00:00Z'),
    ('42d6e7f8-a9b0-1234-defa-456789012345', 'd3e4f5a6-b7c8-9012-defa-123456789012', 'Office supplies',       'equipment',        -87.60, 'USD', 'completed', '2024-02-12T13:15:00Z'),
    ('43e7f8a9-b0c1-2345-efab-567890123456', 'd3e4f5a6-b7c8-9012-defa-123456789012', 'Client invoice #1043',  'freelance',      3100.00, 'USD', 'pending',   '2024-02-26T09:30:00Z'),
    ('44f8a9b0-c1d2-3456-fabc-678901234567', 'd3e4f5a6-b7c8-9012-defa-123456789012', 'Google Ads',            'advertising',    -320.00, 'USD', 'completed', '2024-02-28T08:00:00Z')
ON CONFLICT (unid) DO NOTHING;


-- ── savings_goals ────────────────────────────────────────────────────────────

INSERT INTO savings_goals (unid, user_unid, name, current_amount, target_amount, currency) VALUES
    ('50a9b0c1-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000004', 'Emergency Fund (6 mo)', 8200.00, 18000.00, 'USD'),
    ('51b0c1d2-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000004', 'Japan Vacation',        1450.00,  4500.00, 'USD'),
    ('52c1d2e3-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000004', 'New Laptop',             800.00,  2000.00, 'USD'),
    ('53d2e3f4-a5b6-7890-defa-012345678901', '00000000-0000-4000-8000-100000000004', 'Home Down Payment',    15000.00, 50000.00, 'USD'),
    ('54e3f4a5-b6c7-8901-efab-123456789012', '00000000-0000-4000-8000-100000000004', 'Wedding Fund',          3750.00, 12000.00, 'USD')
ON CONFLICT (unid) DO NOTHING;
