-- Seed: 4 users × 4 accounts × ~80 transactions each.
-- All transaction rows use dynamic INSERT (no fixed UUIDs) so the JOIN
-- on account_type replicates the same pattern for every user automatically.

-- ── accounts ─────────────────────────────────────────────────────────────────

INSERT INTO accounts (unid, user_unid, account_number, iban, label, account_type, balance, currency) VALUES
    ('a1000001-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000001', 'ACC-10001001', 'GB29AUXB10001331926819', 'Personal Checking',    'checking',    4210.50, 'USD'),
    ('b1000001-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000001', 'ACC-10002002', 'GB73AUXB10001398765432', 'Emergency Fund',       'savings',     9500.00, 'USD'),
    ('c1000001-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000001', 'ACC-10003003', 'GB51AUXB10001412345678', 'Investment Portfolio', 'investment', 22000.00, 'USD'),
    ('d1000001-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000001', 'ACC-10004004', 'GB84AUXB10001455556666', 'Freelance Business',   'business',    7800.00, 'USD'),

    ('a2000002-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000002', 'ACC-20001001', 'GB29AUXB20002331926819', 'Personal Checking',    'checking',    2980.25, 'USD'),
    ('b2000002-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000002', 'ACC-20002002', 'GB73AUXB20002398765432', 'Emergency Fund',       'savings',     6100.00, 'USD'),
    ('c2000002-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000002', 'ACC-20003003', 'GB51AUXB20002412345678', 'Investment Portfolio', 'investment', 11250.00, 'USD'),
    ('d2000002-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000002', 'ACC-20004004', 'GB84AUXB20002455556666', 'Freelance Business',   'business',    3420.75, 'USD'),

    ('a3000003-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000003', 'ACC-30001001', 'GB29AUXB30003331926819', 'Personal Checking',    'checking',    1750.00, 'USD'),
    ('b3000003-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000003', 'ACC-30002002', 'GB73AUXB30003398765432', 'Emergency Fund',       'savings',     4800.00, 'USD'),
    ('c3000003-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000003', 'ACC-30003003', 'GB51AUXB30003412345678', 'Investment Portfolio', 'investment',  8900.00, 'USD'),
    ('d3000003-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000003', 'ACC-30004004', 'GB84AUXB30003455556666', 'Freelance Business',   'business',    2100.00, 'USD'),

    ('a0b1c2d3-e4f5-6789-abcd-ef0123456789', '00000000-0000-4000-8000-100000000004', 'ACC-00001001', 'GB29AUXB60161331926819', 'Personal Checking',    'checking',    3450.75, 'USD'),
    ('b1c2d3e4-f5a6-7890-bcde-f01234567890', '00000000-0000-4000-8000-100000000004', 'ACC-00002002', 'GB73AUXB60161398765432', 'Emergency Fund',       'savings',     8200.00, 'USD'),
    ('c2d3e4f5-a6b7-8901-cdef-012345678901', '00000000-0000-4000-8000-100000000004', 'ACC-00003003', 'GB51AUXB60161412345678', 'Investment Portfolio', 'investment', 15750.00, 'USD'),
    ('d3e4f5a6-b7c8-9012-defa-123456789012', '00000000-0000-4000-8000-100000000004', 'ACC-00004004', 'GB84AUXB60161455556666', 'Freelance Business',   'business',    6340.50, 'USD')

ON CONFLICT (unid) DO NOTHING;


-- ── transactions — all users, all accounts ────────────────────────────────────
-- JOIN on account_type replicates every row for each user's matching account.
-- Dates are spread over ~12 months from NOW() backwards.

INSERT INTO transactions
    (account_unid, transaction_type, description, category, amount, currency,
     counterparty_name, reference, status, created_at)
SELECT
    a.unid,
    v.tx_type,
    v.description,
    v.category,
    v.amount,
    'USD',
    v.counterparty,
    v.reference,
    v.status,
    NOW() - v.days_ago
FROM accounts a
JOIN (VALUES
    -- ── CHECKING (30 rows) ───────────────────────────────────────────────────
    -- Monthly salary × 12
    ('checking'::text,'credit'::text,      'Salary — January',         'salary'::text,        3500.00,'Employer Corp',       'SAL-JAN', 'completed'::text, INTERVAL  '30 days'),
    ('checking',      'credit',            'Salary — February',        'salary',              3500.00,'Employer Corp',       'SAL-FEB', 'completed',       INTERVAL  '60 days'),
    ('checking',      'credit',            'Salary — March',           'salary',              3500.00,'Employer Corp',       'SAL-MAR', 'completed',       INTERVAL  '91 days'),
    ('checking',      'credit',            'Salary — April',           'salary',              3600.00,'Employer Corp',       'SAL-APR', 'completed',       INTERVAL '121 days'),
    ('checking',      'credit',            'Salary — May',             'salary',              3600.00,'Employer Corp',       'SAL-MAY', 'completed',       INTERVAL '152 days'),
    ('checking',      'credit',            'Salary — June',            'salary',              3600.00,'Employer Corp',       'SAL-JUN', 'completed',       INTERVAL '182 days'),
    ('checking',      'credit',            'Salary — July',            'salary',              3700.00,'Employer Corp',       'SAL-JUL', 'completed',       INTERVAL '213 days'),
    ('checking',      'credit',            'Salary — August',          'salary',              3700.00,'Employer Corp',       'SAL-AUG', 'completed',       INTERVAL '244 days'),
    ('checking',      'credit',            'Salary — September',       'salary',              3700.00,'Employer Corp',       'SAL-SEP', 'completed',       INTERVAL '274 days'),
    ('checking',      'credit',            'Salary — October',         'salary',              3800.00,'Employer Corp',       'SAL-OCT', 'completed',       INTERVAL '305 days'),
    ('checking',      'credit',            'Salary — November',        'salary',              3800.00,'Employer Corp',       'SAL-NOV', 'completed',       INTERVAL '335 days'),
    ('checking',      'credit',            'Salary — December',        'salary',              4000.00,'Employer Corp',       'SAL-DEC', 'completed',       INTERVAL '365 days'),
    -- Housing
    ('checking',      'debit',             'Rent payment',             'housing',            -1800.00,'Green Oak Properties','RENT-01',  'completed',       INTERVAL   '5 days'),
    ('checking',      'debit',             'Rent payment',             'housing',            -1800.00,'Green Oak Properties','RENT-02',  'completed',       INTERVAL  '35 days'),
    ('checking',      'debit',             'Rent payment',             'housing',            -1800.00,'Green Oak Properties','RENT-03',  'completed',       INTERVAL  '65 days'),
    -- Groceries
    ('checking',      'debit',             'Whole Foods',              'groceries',           -134.52,'Whole Foods Market',  NULL,       'completed',       INTERVAL   '3 days'),
    ('checking',      'debit',             'Trader Joe''s',            'groceries',            -89.30,'Trader Joe''s',       NULL,       'completed',       INTERVAL  '17 days'),
    ('checking',      'debit',             'Costco',                   'groceries',           -212.10,'Costco Wholesale',    NULL,       'completed',       INTERVAL  '45 days'),
    ('checking',      'debit',             'Whole Foods',              'groceries',           -101.88,'Whole Foods Market',  NULL,       'completed',       INTERVAL  '72 days'),
    -- Utilities
    ('checking',      'debit',             'Electric bill',            'utilities',            -98.40,'City Power Co.',      'ELEC-01',  'completed',       INTERVAL   '8 days'),
    ('checking',      'debit',             'Internet bill',            'utilities',            -59.99,'Comcast',             'NET-01',   'completed',       INTERVAL  '10 days'),
    ('checking',      'debit',             'Water bill',               'utilities',            -34.20,'City Water Dept.',    'WAT-01',   'completed',       INTERVAL  '20 days'),
    -- Dining & entertainment
    ('checking',      'debit',             'Uber Eats',                'dining',               -38.40,'Uber Eats',           NULL,       'completed',       INTERVAL   '4 days'),
    ('checking',      'debit',             'Chipotle',                 'dining',               -24.80,'Chipotle Mexican',    NULL,       'completed',       INTERVAL  '11 days'),
    ('checking',      'debit',             'Cinema tickets',           'entertainment',         -32.00,'AMC Theaters',        NULL,       'completed',       INTERVAL  '25 days'),
    -- Transport
    ('checking',      'debit',             'Uber ride',                'transport',            -18.50,'Uber',                NULL,       'completed',       INTERVAL   '2 days'),
    ('checking',      'debit',             'Gas station',              'transport',            -65.00,'Shell',               NULL,       'completed',       INTERVAL  '14 days'),
    -- Fitness & health
    ('checking',      'debit',             'Gym membership',           'fitness',              -49.00,'FitLife Gym',         NULL,       'completed',       INTERVAL   '7 days'),
    ('checking',      'debit',             'Pharmacy',                 'health',               -22.40,'CVS Pharmacy',        NULL,       'completed',       INTERVAL  '19 days'),
    -- Subscriptions
    ('checking',      'debit',             'Netflix',                  'subscriptions',        -15.99,'Netflix Inc.',        NULL,       'completed',       INTERVAL   '1 day'),

    -- ── SAVINGS (12 rows) ────────────────────────────────────────────────────
    -- Monthly interest × 12
    ('savings',       'interest',          'Interest — Month 1',       'interest',              14.85,NULL,                  'INT-01',   'completed',       INTERVAL  '30 days'),
    ('savings',       'interest',          'Interest — Month 2',       'interest',              14.92,NULL,                  'INT-02',   'completed',       INTERVAL  '60 days'),
    ('savings',       'interest',          'Interest — Month 3',       'interest',              15.01,NULL,                  'INT-03',   'completed',       INTERVAL  '91 days'),
    ('savings',       'interest',          'Interest — Month 4',       'interest',              15.10,NULL,                  'INT-04',   'completed',       INTERVAL '121 days'),
    ('savings',       'interest',          'Interest — Month 5',       'interest',              15.18,NULL,                  'INT-05',   'completed',       INTERVAL '152 days'),
    ('savings',       'interest',          'Interest — Month 6',       'interest',              15.25,NULL,                  'INT-06',   'completed',       INTERVAL '182 days'),
    ('savings',       'interest',          'Interest — Month 7',       'interest',              15.33,NULL,                  'INT-07',   'completed',       INTERVAL '213 days'),
    ('savings',       'interest',          'Interest — Month 8',       'interest',              15.40,NULL,                  'INT-08',   'completed',       INTERVAL '244 days'),
    ('savings',       'interest',          'Interest — Month 9',       'interest',              15.48,NULL,                  'INT-09',   'completed',       INTERVAL '274 days'),
    ('savings',       'interest',          'Interest — Month 10',      'interest',              15.55,NULL,                  'INT-10',   'completed',       INTERVAL '305 days'),
    ('savings',       'interest',          'Interest — Month 11',      'interest',              15.62,NULL,                  'INT-11',   'completed',       INTERVAL '335 days'),
    ('savings',       'interest',          'Interest — Month 12',      'interest',              15.70,NULL,                  'INT-12',   'completed',       INTERVAL '365 days'),

    -- ── INVESTMENT (22 rows) ─────────────────────────────────────────────────
    -- Monthly dividends × 12
    ('investment',    'credit',            'Dividend — Q1 Jan',        'dividend',              88.50,'Vanguard',            'DIV-Q1-1', 'completed',       INTERVAL  '30 days'),
    ('investment',    'credit',            'Dividend — Q1 Feb',        'dividend',              91.20,'Vanguard',            'DIV-Q1-2', 'completed',       INTERVAL  '60 days'),
    ('investment',    'credit',            'Dividend — Q1 Mar',        'dividend',              94.10,'Vanguard',            'DIV-Q1-3', 'completed',       INTERVAL  '91 days'),
    ('investment',    'credit',            'Dividend — Q2 Apr',        'dividend',              88.75,'Vanguard',            'DIV-Q2-1', 'completed',       INTERVAL '121 days'),
    ('investment',    'credit',            'Dividend — Q2 May',        'dividend',              92.30,'Vanguard',            'DIV-Q2-2', 'completed',       INTERVAL '152 days'),
    ('investment',    'credit',            'Dividend — Q2 Jun',        'dividend',              96.00,'Vanguard',            'DIV-Q2-3', 'completed',       INTERVAL '182 days'),
    -- Buy orders
    ('investment',    'debit',             'S&P 500 ETF purchase',     'investment',          -2500.00,'Vanguard',           'VG-BUY-1', 'completed',       INTERVAL  '15 days'),
    ('investment',    'debit',             'NASDAQ ETF purchase',      'investment',          -1800.00,'Fidelity',           'FID-BUY-1','completed',       INTERVAL  '45 days'),
    ('investment',    'debit',             'Bond fund purchase',        'investment',           -950.00,'iShares',            'ISH-BUY-1','completed',       INTERVAL  '75 days'),
    ('investment',    'debit',             'Tech growth ETF',          'investment',          -3200.00,'Schwab',             'SCH-BUY-1','completed',       INTERVAL '110 days'),
    ('investment',    'debit',             'Emerging markets ETF',     'investment',          -1100.00,'Vanguard',           'VG-BUY-2', 'completed',       INTERVAL '160 days'),
    -- Sell orders
    ('investment',    'credit',            'Tech stock sale',          'investment',           1800.00,'Fidelity',           'FID-SELL-1','completed',      INTERVAL  '30 days'),
    ('investment',    'credit',            'Bond maturity payout',     'investment',           1020.00,'iShares',            'ISH-MAT-1','completed',       INTERVAL  '90 days'),
    ('investment',    'credit',            'ETF partial sale',         'investment',            760.00,'Vanguard',           'VG-SELL-1','completed',       INTERVAL '200 days'),
    -- Monthly interest
    ('investment',    'interest',          'Portfolio interest',        'interest',              22.10,NULL,                  'INT-PORT', 'completed',       INTERVAL  '5 days'),
    -- Management fee
    ('investment',    'fee',               'Platform fee',             'fees',                  -9.99,'Vanguard',            'FEE-01',   'completed',       INTERVAL  '28 days'),
    ('investment',    'fee',               'Platform fee',             'fees',                  -9.99,'Vanguard',            'FEE-02',   'completed',       INTERVAL  '58 days'),
    ('investment',    'fee',               'Platform fee',             'fees',                  -9.99,'Vanguard',            'FEE-03',   'completed',       INTERVAL  '88 days'),
    -- Refund
    ('investment',    'refund',            'Trade error refund',       'refund',                45.00,'Fidelity',            'REF-ERR-1','completed',       INTERVAL '140 days'),
    -- Insurance
    ('investment',    'debit',             'Portfolio insurance',      'insurance',             -29.00,'AXA',                'INS-PORT', 'completed',       INTERVAL  '20 days'),
    -- Travel (investment conf)
    ('investment',    'debit',             'Finance conference',       'travel',               -420.00,'Eventbrite',         'EVT-01',   'completed',       INTERVAL '250 days'),
    -- Education
    ('investment',    'debit',             'Trading course',           'education',            -199.00,'Udemy',              'EDU-01',   'completed',       INTERVAL '300 days'),

    -- ── BUSINESS (20 rows) ───────────────────────────────────────────────────
    -- Client invoices
    ('business',      'credit',            'Client invoice #1042',     'freelance',            4200.00,'Horizon Digital Ltd', 'INV-1042', 'completed',      INTERVAL  '10 days'),
    ('business',      'credit',            'Client invoice #1043',     'freelance',            3100.00,'BlueSky Agency',      'INV-1043', 'completed',      INTERVAL  '40 days'),
    ('business',      'credit',            'Client invoice #1044',     'freelance',            2800.00,'Apex Solutions',      'INV-1044', 'completed',      INTERVAL  '70 days'),
    ('business',      'credit',            'Client invoice #1045',     'freelance',            5500.00,'TechStart Inc.',      'INV-1045', 'completed',      INTERVAL '100 days'),
    ('business',      'credit',            'Client invoice #1046',     'freelance',            3750.00,'Nova Media',          'INV-1046', 'pending',        INTERVAL '130 days'),
    ('business',      'credit',            'Client invoice #1047',     'freelance',            2200.00,'Orbit Labs',          'INV-1047', 'completed',      INTERVAL '160 days'),
    ('business',      'credit',            'Client invoice #1048',     'freelance',            6100.00,'Peak Digital',        'INV-1048', 'completed',      INTERVAL '200 days'),
    ('business',      'credit',            'Client invoice #1049',     'freelance',            1900.00,'Bloom Ventures',      'INV-1049', 'completed',      INTERVAL '240 days'),
    -- SaaS & subscriptions
    ('business',      'debit',             'Adobe Creative Cloud',     'subscriptions',         -54.99,'Adobe Inc.',          NULL,       'completed',       INTERVAL   '5 days'),
    ('business',      'debit',             'Slack Pro',                'subscriptions',         -12.50,'Slack',               NULL,       'completed',       INTERVAL  '35 days'),
    ('business',      'debit',             'Notion Team',              'subscriptions',         -16.00,'Notion Labs',         NULL,       'completed',       INTERVAL  '65 days'),
    ('business',      'debit',             'Figma Professional',       'subscriptions',         -45.00,'Figma Inc.',          NULL,       'completed',       INTERVAL  '95 days'),
    -- Infrastructure
    ('business',      'debit',             'AWS hosting',              'fees',                 -145.20,'Amazon Web Services', 'AWS-01',   'completed',       INTERVAL   '8 days'),
    ('business',      'debit',             'Google Cloud',             'fees',                  -88.40,'Google LLC',          'GCP-01',   'completed',       INTERVAL  '38 days'),
    ('business',      'debit',             'Cloudflare',               'fees',                  -20.00,'Cloudflare Inc.',     'CF-01',    'completed',       INTERVAL  '68 days'),
    -- Office & supplies
    ('business',      'debit',             'Office supplies',          'shopping',              -87.60,'Staples',             NULL,       'completed',       INTERVAL  '22 days'),
    ('business',      'debit',             'Printer ink',              'shopping',              -34.99,'Staples',             NULL,       'completed',       INTERVAL  '85 days'),
    -- Marketing
    ('business',      'fee',               'Google Ads',               'fees',                 -320.00,'Google LLC',          'GADS-01',  'completed',       INTERVAL  '12 days'),
    ('business',      'fee',               'LinkedIn Ads',             'fees',                 -180.00,'LinkedIn',            'LI-ADS-1', 'completed',       INTERVAL  '50 days'),
    -- Travel
    ('business',      'debit',             'Client meeting travel',    'travel',               -380.00,'American Airlines',   'AA-01',    'completed',       INTERVAL '180 days')

) AS v(account_type, tx_type, description, category, amount, counterparty, reference, status, days_ago)
    ON a.account_type = v.account_type
WHERE a.user_unid IN (
    '00000000-0000-4000-8000-100000000001',
    '00000000-0000-4000-8000-100000000002',
    '00000000-0000-4000-8000-100000000003',
    '00000000-0000-4000-8000-100000000004'
);


-- ── savings_goals (all users)  ─────────────────────────────────────────────────

INSERT INTO savings_goals (unid, user_unid, name, current_amount, target_amount, currency) VALUES
    ('50a90001-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000001', 'Emergency Fund (6 mo)',  9500.00, 20000.00, 'USD'),
    ('51b00001-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000001', 'Retirement Fund',        5000.00,100000.00, 'USD'),
    ('52c10001-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000001', 'Home Down Payment',     22000.00, 50000.00, 'USD'),

    ('50a90002-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000002', 'Emergency Fund (6 mo)',  6100.00, 15000.00, 'USD'),
    ('51b00002-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000002', 'New Car',                3200.00, 25000.00, 'USD'),
    ('52c10002-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000002', 'Japan Vacation',         1800.00,  4500.00, 'USD'),

    ('50a90003-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000003', 'Emergency Fund',         4800.00, 12000.00, 'USD'),
    ('51b00003-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000003', 'New Laptop',              800.00,  2000.00, 'USD'),
    ('52c10003-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000003', 'Wedding Fund',           2100.00, 12000.00, 'USD'),

    ('50a9b0c1-d2e3-4567-abcd-789012345678', '00000000-0000-4000-8000-100000000004', 'Emergency Fund (6 mo)',  8200.00, 18000.00, 'USD'),
    ('51b0c1d2-e3f4-5678-bcde-890123456789', '00000000-0000-4000-8000-100000000004', 'Japan Vacation',         1450.00,  4500.00, 'USD'),
    ('52c1d2e3-f4a5-6789-cdef-901234567890', '00000000-0000-4000-8000-100000000004', 'New Laptop',              800.00,  2000.00, 'USD'),
    ('53d2e3f4-a5b6-7890-defa-012345678901', '00000000-0000-4000-8000-100000000004', 'Home Down Payment',     15000.00, 50000.00, 'USD'),
    ('54e3f4a5-b6c7-8901-efab-123456789012', '00000000-0000-4000-8000-100000000004', 'Wedding Fund',           3750.00, 12000.00, 'USD')

ON CONFLICT (unid) DO NOTHING;
