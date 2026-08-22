-- Lahore Waste Intelligence System — Supabase schema
-- Mirrors the data shape used by src/lib/store.js so the localStorage
-- functions can be swapped for supabase-js calls with minimal changes.

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Row Level Security: allow public read (this is a public city-intelligence
-- dashboard), restrict writes to authenticated/service role in production.
alter table hotspots enable row level security;
alter table reports enable row level security;

create policy "Public read hotspots" on hotspots for select using (true);
create policy "Public read reports" on reports for select using (true);
