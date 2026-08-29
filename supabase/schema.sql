-- Lahore Waste Intelligence System — Supabase schema
-- Mirrors the data shape used by src/lib/store.js.
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DROP+CREATE
-- POLICY so running this again on an existing database upgrades it in place
-- instead of erroring.

create table if not exists hotspots (
  id text primary key,
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  severity text not null check (severity in ('critical','high','moderate','low')),
  waste_types jsonb not null default '[]',
  reports_count integer not null default 0,
  recurrence integer not null default 0,
  recyclable_pct integer not null default 0,
  burning boolean not null default false,
  nearby jsonb not null default '[]',
  trend jsonb not null default '[]',
  status text not null default 'unresolved' check (status in ('unresolved','in_progress','resolved')),
  last_reported date,
  before_snapshot jsonb,
  source text,
  type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path for a database created from an earlier version of this file.
alter table hotspots add column if not exists before_snapshot jsonb;
alter table hotspots add column if not exists source text;
alter table hotspots add column if not exists type text;

create table if not exists reports (
  id text primary key,
  hotspot_id text references hotspots(id),
  lat double precision not null,
  lng double precision not null,
  location_label text,
  area text,
  photo_url text,
  analysis jsonb, -- structured AI output: categories, severity, recoverable_pct, hazard_indicators, confidence, source
  priority_score numeric(3,1),
  created_at timestamptz not null default now()
);

create index if not exists idx_hotspots_area on hotspots(area);
create index if not exists idx_hotspots_severity on hotspots(severity);
create index if not exists idx_reports_hotspot on reports(hotspot_id);

-- Row Level Security. This is a public city-intelligence demo with no login
-- system yet, so citizen reports and ops-mode status changes come straight
-- from the anon browser client — public insert/update is required for the
-- app to function at all. Tighten this (require authenticated role) before
-- any real production rollout with a real login system.
alter table hotspots enable row level security;
alter table reports enable row level security;

drop policy if exists "Public read hotspots" on hotspots;
create policy "Public read hotspots" on hotspots for select using (true);

drop policy if exists "Public insert hotspots" on hotspots;
create policy "Public insert hotspots" on hotspots for insert with check (true);

drop policy if exists "Public update hotspots" on hotspots;
create policy "Public update hotspots" on hotspots for update using (true);

drop policy if exists "Public delete hotspots" on hotspots;
create policy "Public delete hotspots" on hotspots for delete using (true);

drop policy if exists "Public read reports" on reports;
create policy "Public read reports" on reports for select using (true);

drop policy if exists "Public insert reports" on reports;
create policy "Public insert reports" on reports for insert with check (true);
