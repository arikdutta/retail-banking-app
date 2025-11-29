CREATE TABLE IF NOT EXISTS roleaccesses
(
    unid                         UUID         PRIMARY KEY NOT NULL,
    created                      TIMESTAMPTZ              NOT NULL,
    role                         TEXT                     NOT NULL DEFAULT 'RegularUser' CHECK (role IN ('Root', 'Admin', 'RegularUser', 'Demo')),
    grantedto_unid               UUID                     NOT NULL,
    FOREIGN KEY (grantedto_unid) REFERENCES users (unid)
);

CREATE INDEX IF NOT EXISTS idx_roleaccesses_grantedto ON roleaccesses USING btree (grantedto_unid);
CREATE INDEX IF NOT EXISTS idx_roleaccesses_role      ON roleaccesses USING btree (role);


INSERT INTO users (unid, email, password, role) VALUES
    (
        '00000000-0000-4000-8000-100000000004',
        'user@example.com',
        '$6$a8q/LStXr5d9WUGs$D59OuFN7SsKhUYBLGGkb1hNWiX5mEdprxPJKxFnooJ0VLHNNehYub.WRpL2OVsmVSjneUNvMnk50chhOi8Dt61',
        'RegularUser'
    )
ON CONFLICT DO NOTHING;


INSERT INTO roleaccesses (unid, created, role, grantedto_unid) VALUES
-- root@example.com — Root
(
    'a1000000-0000-4000-8000-000000000001',
    now(),
    'Root',
    '00000000-0000-4000-8000-100000000001'
),
-- admin@example.com — Admin
(
    'a1000000-0000-4000-8000-000000000002',
    now(),
    'Admin',
    '00000000-0000-4000-8000-100000000002'
),
-- demo@scalenza.com — Demo
(
    'a1000000-0000-4000-8000-000000000003',
    now(),
    'Demo',
    '00000000-0000-4000-8000-100000000003'
),
-- user@example.com — RegularUser
(
    'a1000000-0000-4000-8000-000000000004',
    now(),
    'RegularUser',
    '00000000-0000-4000-8000-100000000004'
)
ON CONFLICT (unid) DO NOTHING;
