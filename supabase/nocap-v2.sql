-- NoCap v2 migration
-- Run this in Supabase SQL editor AFTER nocap.sql

-- 1. User-pinned places table
create table if not exists public.nocap_user_places (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.nocap_profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  category text not null check (category in ('eat', 'street', 'park', 'culture')),
  address text not null default '',
  latitude double precision not null check (latitude between 12.72 and 13.2),
  longitude double precision not null check (longitude between 77.34 and 77.9),
  created_at timestamptz not null default now()
);

create index if not exists nocap_user_places_profile_idx on public.nocap_user_places (profile_id);
create index if not exists nocap_user_places_location_idx on public.nocap_user_places (latitude, longitude);

alter table public.nocap_user_places enable row level security;
drop policy if exists "Public user places readable" on public.nocap_user_places;
create policy "Public user places readable" on public.nocap_user_places for select using (true);
drop policy if exists "No direct user place writes" on public.nocap_user_places;
create policy "No direct user place writes" on public.nocap_user_places for all using (false) with check (false);

-- 2. Add is_legit + payment_id to reviews
alter table public.nocap_reviews
  add column if not exists is_legit boolean not null default false,
  add column if not exists payment_id text;

-- 3. Relax accuracy constraint (allow up to 500m for desktop/wifi)
alter table public.nocap_reviews
  drop constraint if exists nocap_reviews_accuracy_meters_check;
alter table public.nocap_reviews
  add constraint nocap_reviews_accuracy_meters_check
  check (accuracy_meters > 0 and accuracy_meters <= 500);

-- 4. Index for legit reviews to appear first
create index if not exists nocap_reviews_legit_idx on public.nocap_reviews (place_id, is_legit desc, created_at desc);

