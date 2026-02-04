-- Active: 1779365977602@@127.0.0.1@5432@retail_banking_app
-- Migrations will appear here as you chat with AI

create table customers (
  id bigint primary key generated always as identity,
  first_name text,
  last_name text,
  email text unique,
  phone_number text,
  address text,
  date_of_birth date
);

create table accounts (
  id bigint primary key generated always as identity,
  customer_id bigint references customers (id),
  account_number text unique,
  account_type text,
  balance numeric,
  created_at timestamp with time zone default now()
);

create table transactions (
  id bigint primary key generated always as identity,
  account_id bigint references accounts (id),
  transaction_type text,
  amount numeric,
  transaction_date timestamp with time zone default now(),
  description text
);

create table loans (
  id bigint primary key generated always as identity,
  customer_id bigint references customers (id),
  loan_type text,
  amount numeric,
  interest_rate numeric,
  start_date date,
  end_date date
);

create table cards (
  id bigint primary key generated always as identity,
  customer_id bigint references customers (id),
  card_number text unique,
  card_type text,
  expiry_date date,
  cvv text
);

create table notifications (
  id bigint primary key generated always as identity,
  customer_id bigint references customers (id),
  message text,
  sent_at timestamp with time zone default now(),
  status text
);

create table card_transactions (
  id bigint primary key generated always as identity,
  card_id bigint references cards (id),
  transaction_date timestamp with time zone default now(),
  amount numeric,
  merchant_name text,
  location text
);

create table master_data (
  id bigint primary key generated always as identity,
  category text,
  code text,
  description text
);