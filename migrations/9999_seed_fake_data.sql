-- Seed fake data for accounts, transactions, and savings_goals.
-- All rows reference user 00000000-0000-4000-8000-100000000004 (existing test user).

-- ── accounts ────────────────────────────────────────────────────────────────

INSERT INTO accounts (unid, user_unid, account_number, iban, label, account_type, balance, currency) VALUES
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000004',
     'ACC-00001001', 'GB29AUXB60161331926819', 'Personal Checking',    'checking',   3450.75, 'USD'),
    ('b1c2d3e4-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000004',
     'ACC-00002002', 'GB73AUXB60161398765432', 'Emergency Fund',       'savings',    8200.00, 'USD'),
    ('c2d3e4f5-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000004',
     'ACC-00003003', 'GB51AUXB60161412345678', 'Investment Portfolio', 'investment', 15750.00, 'USD'),
    ('d3e4f5a6-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000004',
     'ACC-00004004', 'GB84AUXB60161455556666', 'Freelance Business',   'business',   6340.50, 'USD')
ON CONFLICT (unid) DO NOTHING;


-- ── transactions ─────────────────────────────────────────────────────────────
-- Historical rows (fixed dates) + recent rows (relative to NOW()) for live dashboard data.

INSERT INTO transactions (unid, account_unid, transaction_type, description, category, amount, currency, counterparty_name, counterparty_iban, reference, status, created_at) VALUES

    -- Personal Checking — historical
    ('10a1b2c3-d4e5-6789-abcd-f01234567890', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'debit',       'Rent payment',         'housing',       -1800.00, 'USD', 'Green Oak Properties',   NULL,                   'REF-RENT-0224',   'completed', '2024-02-01T09:00:00Z'),
    ('11b2c3d4-e5f6-7890-bcde-012345678901', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'debit',       'Whole Foods',          'groceries',      -134.52, 'USD', 'Whole Foods Market',     NULL,                   NULL,              'completed', '2024-02-03T17:45:00Z'),
    ('12c3d4e5-f6a7-8901-cdef-123456789012', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'debit',       'Netflix',              'subscriptions',   -15.99, 'USD', 'Netflix Inc.',           NULL,                   NULL,              'completed', '2024-02-05T00:00:00Z'),
    ('13d4e5f6-a7b8-9012-defa-234567890123', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'credit',      'Salary deposit',       'salary',         3500.00, 'USD', 'Acme Corp',              'GB14MIDL40051512345678', 'SAL-FEB-2024',   'completed', '2024-02-15T08:00:00Z'),
    ('14e5f6a7-b8c9-0123-efab-345678901234', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'debit',       'Electric bill',        'utilities',       -98.40, 'USD', 'City Power Co.',         NULL,                   'BILL-240218',     'completed', '2024-02-18T12:30:00Z'),
    ('15f6a7b8-c9d0-1234-fabc-456789012345', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'debit',       'Gym membership',       'fitness',         -49.00, 'USD', 'FitLife Gym',            NULL,                   NULL,              'completed', '2024-02-20T07:00:00Z'),
    ('16a7b8c9-d0e1-2345-abcd-567890123456', 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
     'transfer_out','Transfer to savings',  'transfer',       -200.00, 'USD', NULL,                     'GB73AUXB60161398765432', 'TRF-INT-0001',   'completed', '2024-02-22T10:00:00Z'),

    -- Emergency Fund (savings account) — historical
    ('20b8c9d0-e1f2-3456-bcde-678901234567', 'b1c2d3e4-f5a6-7890-bcde-f01234567890',
     'transfer_in', 'Transfer from checking','transfer',       200.00, 'USD', NULL,                     'GB29AUXB60161331926819', 'TRF-INT-0001',   'completed', '2024-02-22T10:01:00Z'),
    ('21c9d0e1-f2a3-4567-cdef-789012345678', 'b1c2d3e4-f5a6-7890-bcde-f01234567890',
     'interest',    'Interest earned',      'interest',         18.45, 'USD', NULL,                     NULL,                   'INT-FEB-2024',    'completed', '2024-02-28T23:59:00Z'),

    -- Investment Portfolio — historical
    ('30d0e1f2-a3b4-5678-defa-890123456789', 'c2d3e4f5-a6b7-8901-cdef-012345678901',
     'debit',       'S&P 500 ETF purchase', 'investment',    -2500.00, 'USD', 'Vanguard',               NULL,                   'VG-BUY-00442',    'completed', '2024-02-02T10:15:00Z'),
    ('31e1f2a3-b4c5-6789-efab-901234567890', 'c2d3e4f5-a6b7-8901-cdef-012345678901',
     'credit',      'Dividend payout',      'dividend',        125.30, 'USD', 'Vanguard',               NULL,                   'VG-DIV-00442',    'completed', '2024-02-14T09:00:00Z'),
    ('32f2a3b4-c5d6-7890-fabc-012345678901', 'c2d3e4f5-a6b7-8901-cdef-012345678901',
     'credit',      'Tech stock sale',      'investment',     1800.00, 'USD', 'Fidelity',               NULL,                   'FID-SELL-9921',   'completed', '2024-02-21T14:20:00Z'),
    ('33a3b4c5-d6e7-8901-abcd-123456789012', 'c2d3e4f5-a6b7-8901-cdef-012345678901',
     'debit',       'Bond purchase',        'investment',      -950.00, 'USD', 'iShares',               NULL,                   'ISH-BUY-4412',    'pending',   '2024-02-25T11:00:00Z'),

    -- Freelance Business — historical
    ('40b4c5d6-e7f8-9012-bcde-234567890123', 'd3e4f5a6-b7c8-9012-defa-123456789012',
     'credit',      'Client invoice #1042', 'freelance',      4200.00, 'USD', 'Horizon Digital Ltd',    'GB22BARC20714783608309', 'INV-1042',        'completed', '2024-02-07T16:00:00Z'),
    ('41c5d6e7-f8a9-0123-cdef-345678901234', 'd3e4f5a6-b7c8-9012-defa-123456789012',
     'debit',       'Adobe Creative Cloud', 'subscriptions',   -54.99, 'USD', 'Adobe Inc.',             NULL,                   NULL,              'completed', '2024-02-10T00:00:00Z'),
    ('42d6e7f8-a9b0-1234-defa-456789012345', 'd3e4f5a6-b7c8-9012-defa-123456789012',
     'debit',       'Office supplies',      'shopping',        -87.60, 'USD', 'Staples',                NULL,                   NULL,              'completed', '2024-02-12T13:15:00Z'),
    ('43e7f8a9-b0c1-2345-efab-567890123456', 'd3e4f5a6-b7c8-9012-defa-123456789012',
     'credit',      'Client invoice #1043', 'freelance',      3100.00, 'USD', 'BlueSky Agency',         'GB33HSBC40297112345678', 'INV-1043',        'pending',   '2024-02-26T09:30:00Z'),
    ('44f8a9b0-c1d2-3456-fabc-678901234567', 'd3e4f5a6-b7c8-9012-defa-123456789012',
     'fee',         'Google Ads spend',     'fees',           -320.00, 'USD', 'Google LLC',             NULL,                   'GADS-FEB-2024',   'completed', '2024-02-28T08:00:00Z')

ON CONFLICT (unid) DO NOTHING;

-- Recent rows without fixed UUIDs — always relative to NOW() so the money-flow
-- and activity widgets show live data regardless of when the DB was seeded.
INSERT INTO transactions (account_unid, transaction_type, description, category, amount, currency, counterparty_name, reference, status, created_at)
SELECT
    a.unid, v.tx_type, v.description, v.category, v.amount, 'USD',
    v.counterparty, v.reference, v.status,
    NOW() - v.offset_interval
FROM accounts a
CROSS JOIN (VALUES
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789'::uuid, 'credit',      'Salary deposit',        'salary',        3500.00, 'Acme Corp',           'SAL-CURR',   'completed', INTERVAL '0 days'),
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789'::uuid, 'debit',       'Rent payment',          'housing',      -1800.00, 'Green Oak Properties', 'RENT-CURR',  'completed', INTERVAL '1 day'),
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789'::uuid, 'debit',       'Whole Foods',           'groceries',     -112.30, 'Whole Foods Market',  NULL,         'completed', INTERVAL '2 days'),
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789'::uuid, 'debit',       'Spotify',               'subscriptions',  -10.99, 'Spotify AB',          NULL,         'completed', INTERVAL '3 days'),
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789'::uuid, 'debit',       'Uber Eats',             'dining',         -38.40, 'Uber Eats',           NULL,         'completed', INTERVAL '4 days'),
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789'::uuid, 'debit',       'Internet bill',         'utilities',      -59.99, 'Comcast',             'BILL-CURR',  'completed', INTERVAL '5 days'),
    ('d3e4f5a6-b7c8-9012-defa-123456789012'::uuid, 'credit',      'Client invoice #1044',  'freelance',     2800.00, 'Apex Solutions',      'INV-1044',   'completed', INTERVAL '1 day'),
    ('d3e4f5a6-b7c8-9012-defa-123456789012'::uuid, 'debit',       'AWS hosting',           'fees',          -145.20, 'Amazon Web Services', 'AWS-CURR',   'completed', INTERVAL '3 days'),
    ('c2d3e4f5-a6b7-8901-cdef-012345678901'::uuid, 'interest',    'Monthly interest',      'interest',        22.10, NULL,                  'INT-CURR',   'completed', INTERVAL '0 days'),
    ('b1c2d3e4-f5a6-7890-bcde-f01234567890'::uuid, 'interest',    'Savings interest',      'interest',        14.85, NULL,                  'INT-SAV',    'completed', INTERVAL '1 day')
) AS v(account_id, tx_type, description, category, amount, counterparty, reference, status, offset_interval)
WHERE a.unid = v.account_id;


-- ── savings_goals ────────────────────────────────────────────────────────────

INSERT INTO savings_goals (unid, user_unid, name, current_amount, target_amount, currency) VALUES
    ('50a9b0c1-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000004', 'Emergency Fund (6 mo)', 8200.00, 18000.00, 'USD'),
    ('51b0c1d2-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000004', 'Japan Vacation',        1450.00,  4500.00, 'USD'),
    ('52c1d2e3-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000004', 'New Laptop',             800.00,  2000.00, 'USD'),
    ('53d2e3f4-a5b6-7890-defa-012345678901', '00000000-0000-4000-8000-100000000004', 'Home Down Payment',    15000.00, 50000.00, 'USD'),
    ('54e3f4a5-b6c7-8901-efab-123456789012', '00000000-0000-4000-8000-100000000004', 'Wedding Fund',          3750.00, 12000.00, 'USD')
ON CONFLICT (unid) DO NOTHING;
