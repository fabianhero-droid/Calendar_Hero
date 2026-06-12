-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Events table
create table if not exists events (
  id text primary key,
  title text not null,
  description text,
  start timestamptz not null,
  "end" timestamptz not null,
  color text default 'blue',
  all_day boolean default false,
  remind_minutes int,
  created_at timestamptz default now()
);

-- Push subscriptions table
create table if not exists push_subscriptions (
  endpoint text primary key,
  subscription text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) — public access for personal use
alter table events enable row level security;
alter table push_subscriptions enable row level security;

create policy "Allow all" on events for all using (true) with check (true);
create policy "Allow all" on push_subscriptions for all using (true) with check (true);

-- WebUntis credentials (for cron-based substitution notifications)
create table if not exists untis_credentials (
  id int primary key default 1,
  school text not null,
  username text not null,
  password text not null,
  server text not null,
  updated_at timestamptz default now()
);

alter table untis_credentials enable row level security;
create policy "Allow all" on untis_credentials for all using (true) with check (true);
