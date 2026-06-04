CREATE TABLE user_profiles (
    user_unid     UUID PRIMARY KEY REFERENCES users(unid) ON DELETE CASCADE,
    first_name    TEXT,
    last_name     TEXT,
    date_of_birth DATE,
    phone         TEXT,
    country       TEXT,
    city          TEXT,
    address       TEXT,
    postal_code   TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed user_profiles for all 4 seed users. Idempotent (ON CONFLICT DO NOTHING).

INSERT INTO user_profiles (user_unid, first_name, last_name, date_of_birth, phone, country, city, address, postal_code)
VALUES
    (
        '00000000-0000-4000-8000-100000000001',
        'Alex',
        'Johnson',
        '1985-03-14',
        '+1 (555) 210-4400',
        'United States',
        'San Francisco',
        '742 Market Street, Apt 3B',
        '94102'
    ),
    (
        '00000000-0000-4000-8000-100000000002',
        'Sarah',
        'Williams',
        '1990-07-22',
        '+1 (555) 348-7712',
        'United States',
        'New York',
        '88 Lexington Avenue, Suite 12',
        '10016'
    ),
    (
        '00000000-0000-4000-8000-100000000003',
        'Marcus',
        'Chen',
        '1993-11-05',
        '+1 (555) 482-9301',
        'United States',
        'Austin',
        '1204 Congress Avenue, Unit 7',
        '78701'
    ),
    (
        '00000000-0000-4000-8000-100000000004',
        'Priya',
        'Patel',
        '1988-05-30',
        '+1 (555) 671-2284',
        'United States',
        'Seattle',
        '3310 Pike Street, Floor 2',
        '98101'
    )
ON CONFLICT (user_unid) DO NOTHING;
