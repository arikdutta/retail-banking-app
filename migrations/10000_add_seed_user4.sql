-- Add the 4th seed user whose UUID is referenced by migration 9999 accounts/profiles.
-- All INSERTs are idempotent (ON CONFLICT DO NOTHING) so re-running is safe.

INSERT INTO users (unid, email, password, role) VALUES
    (
        '00000000-0000-4000-8000-100000000004',
        'user@scalenza.com',
        '$6$a8q/LStXr5d9WUGs$D59OuFN7SsKhUYBLGGkb1hNWiX5mEdprxPJKxFnooJ0VLHNNehYub.WRpL2OVsmVSjneUNvMnk50chhOi8Dt61',
        'RegularUser'
    )
ON CONFLICT (unid) DO NOTHING;

-- Accounts (same UUIDs as in 9999 so ON CONFLICT skips if already present)
INSERT INTO accounts (unid, user_unid, account_number, iban, label, account_type, balance, currency) VALUES
    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000004', 'ACC-00001001', 'GB29AUXB60161331926819', 'Personal Checking',    'checking',    3450.75, 'USD'),
    ('b1c2d3e4-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000004', 'ACC-00002002', 'GB73AUXB60161398765432', 'Emergency Fund',       'savings',     8200.00, 'USD'),
    ('c2d3e4f5-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000004', 'ACC-00003003', 'GB51AUXB60161412345678', 'Investment Portfolio', 'investment', 15750.00, 'USD'),
    ('d3e4f5a6-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000004', 'ACC-00004004', 'GB84AUXB60161455556666', 'Freelance Business',   'business',    6340.50, 'USD')
ON CONFLICT (unid) DO NOTHING;

-- Savings goals
INSERT INTO savings_goals (unid, user_unid, name, current_amount, target_amount, currency) VALUES
    ('50a9b0c1-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000004', 'Emergency Fund (6 mo)',  8200.00, 18000.00, 'USD'),
    ('51b0c1d2-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000004', 'Japan Vacation',         1450.00,  4500.00, 'USD'),
    ('52c1d2e3-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000004', 'New Laptop',              800.00,  2000.00, 'USD'),
    ('53d2e3f4-a5b6-7890-defa-012345678901', '00000000-0000-4000-8000-100000000004', 'Home Down Payment',     15000.00, 50000.00, 'USD'),
    ('54e3f4a5-b6c7-8901-efab-123456789012', '00000000-0000-4000-8000-100000000004', 'Wedding Fund',           3750.00, 12000.00, 'USD')
ON CONFLICT (unid) DO NOTHING;

-- Transactions (re-seed for user 4's accounts; idempotent since no fixed UUIDs = new rows each run)
INSERT INTO transactions
    (account_unid, transaction_type, description, category, amount, currency,
     counterparty_name, reference, status, created_at)
SELECT
    a.unid, v.tx_type, v.description, v.category, v.amount, 'USD',
    v.counterparty, v.reference, v.status, NOW() - v.days_ago
FROM accounts a
JOIN (VALUES
    ('checking'::text,'credit'::text, 'Salary — January',   'salary'::text,  3500.00,'Employer Corp',       'SAL-JAN',  'completed'::text, INTERVAL '30 days'),
    ('checking',      'credit',       'Salary — February',  'salary',         3500.00,'Employer Corp',       'SAL-FEB',  'completed',       INTERVAL '60 days'),
    ('checking',      'credit',       'Salary — March',     'salary',         3500.00,'Employer Corp',       'SAL-MAR',  'completed',       INTERVAL '91 days'),
    ('checking',      'debit',        'Rent payment',        'housing',       -1800.00,'Green Oak Properties','RENT-01',  'completed',       INTERVAL  '5 days'),
    ('checking',      'debit',        'Whole Foods',         'groceries',      -134.52,'Whole Foods Market',  NULL,       'completed',       INTERVAL  '3 days'),
    ('checking',      'debit',        'Electric bill',       'utilities',       -98.40,'City Power Co.',      'ELEC-01',  'completed',       INTERVAL  '8 days'),
    ('checking',      'debit',        'Netflix',             'subscriptions',   -15.99,'Netflix Inc.',        NULL,       'completed',       INTERVAL  '1 day'),
    ('savings',       'interest',     'Interest — Month 1',  'interest',         14.85, NULL,                 'INT-01',   'completed',       INTERVAL '30 days'),
    ('savings',       'interest',     'Interest — Month 2',  'interest',         14.92, NULL,                 'INT-02',   'completed',       INTERVAL '60 days'),
    ('investment',    'credit',       'Dividend — Q1 Jan',   'dividend',         88.50,'Vanguard',            'DIV-Q1-1', 'completed',       INTERVAL '30 days'),
    ('investment',    'debit',        'S&P 500 ETF purchase','investment',     -2500.00,'Vanguard',            'VG-BUY-1', 'completed',       INTERVAL '15 days'),
    ('business',      'credit',       'Client invoice #1042','freelance',      4200.00,'Horizon Digital Ltd', 'INV-1042', 'completed',       INTERVAL '10 days'),
    ('business',      'credit',       'Client invoice #1043','freelance',      3100.00,'BlueSky Agency',      'INV-1043', 'completed',       INTERVAL '40 days'),
    ('business',      'debit',        'AWS hosting',         'fees',           -145.20,'Amazon Web Services', 'AWS-01',   'completed',       INTERVAL  '8 days')
) AS v(account_type, tx_type, description, category, amount, counterparty, reference, status, days_ago)
    ON a.account_type = v.account_type
WHERE a.user_unid = '00000000-0000-4000-8000-100000000004';
