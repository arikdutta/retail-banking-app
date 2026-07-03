ALTER TABLE transactions DROP CONSTRAINT transactions_category_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
    CHECK (category IN (
        'salary', 'freelance', 'interest', 'dividend', 'refund',
        'housing', 'groceries', 'transport', 'dining', 'entertainment',
        'health', 'education', 'shopping', 'utilities', 'subscriptions',
        'travel', 'fitness', 'transfer', 'investment', 'fees',
        'insurance', 'other', 'deposit'
    ));
