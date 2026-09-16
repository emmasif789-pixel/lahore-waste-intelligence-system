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
  location_source text default 'gps' check (location_source in ('gps','manual')),
  user_location_note text,
  photo_verified boolean not null default false,
  analysis jsonb, -- structured AI output: categories, severity, recoverable_pct, hazard_indicators, confidence, source
  priority_score numeric(3,1),
  created_at timestamptz not null default now()
);

-- Upgrade path for a database created from an earlier version of this file.
alter table reports add column if not exists location_source text default 'gps' check (location_source in ('gps','manual'));
alter table reports add column if not exists user_location_note text;
alter table reports add column if not exists photo_verified boolean not null default false;

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
create policy "Public delete hotspots" on hotspots
  for delete using (id ~ '^LHR-0[0-9]{2}$');
-- Scoped, not "using (true)": the app only ever needs to delete its own
-- known seed rows as part of the auto-resync logic in loadHotspots() —
-- never a citizen-submitted row, whose id is a 13-digit timestamp and can
-- never match this pattern. An open delete policy here would let anyone
-- with the (necessarily public) anon key wipe the live dataset.

drop policy if exists "Public read reports" on reports;
create policy "Public read reports" on reports for select using (true);

drop policy if exists "Public insert reports" on reports;
create policy "Public insert reports" on reports for insert with check (true);

-- Insert-rate throttle on both tables: blocks a scripted flood from
-- dumping fake data into the live public demo, without needing a full
-- auth system. Generous threshold (30 inserts/60s per table) — well
-- above real simultaneous multi-person testing, well below a bot script.
create or replace function reject_if_insert_burst()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
  ts_col text := tg_argv[0];
  max_per_window integer := tg_argv[1]::integer;
begin
  execute format(
    'select count(*) from %I where %I > now() - interval ''60 seconds''',
    tg_table_name, ts_col
  ) into recent_count;

  if recent_count >= max_per_window then
    raise exception 'Rate limit: too many % inserted in the last 60 seconds', tg_table_name;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_hotspots_rate_limit on hotspots;
create trigger trg_hotspots_rate_limit
  before insert on hotspots
  for each row execute function reject_if_insert_burst('created_at', 30);

drop trigger if exists trg_reports_rate_limit on reports;
create trigger trg_reports_rate_limit
  before insert on reports
  for each row execute function reject_if_insert_burst('created_at', 30);

-- Storage bucket for citizen-submitted report photos. Public read so photos
-- are visible to everyone viewing the map; public insert so the anon
-- browser client can upload (no login system yet — same permissive
-- pattern as the tables above, tighten before real production rollout).
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read report photos" on storage.objects;
create policy "Public read report photos" on storage.objects
  for select using (bucket_id = 'report-photos');

drop policy if exists "Public upload report photos" on storage.objects;
create policy "Public upload report photos" on storage.objects
  for insert with check (bucket_id = 'report-photos');
