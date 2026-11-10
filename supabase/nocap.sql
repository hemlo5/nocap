create extension if not exists pgcrypto;

create table if not exists public.nocap_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nocap_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.nocap_profiles(id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 120),
  body text not null check (char_length(trim(body)) between 8 and 1200),
  rating smallint check (rating is null or (rating between 1 and 5)),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision not null check (accuracy_meters > 0 and accuracy_meters <= 500),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, place_id)
);

create table if not exists public.nocap_person_notes (
  id uuid primary key default gen_random_uuid(),
  place_id text not null check (char_length(place_id) between 1 and 120),
  profile_id uuid not null references public.nocap_profiles(id) on delete cascade,
  person_name text not null check (char_length(trim(person_name)) between 1 and 100),
  description text not null check (char_length(trim(description)) between 3 and 1500),
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nocap_reviews_place_created_idx on public.nocap_reviews (place_id, created_at desc);
create index if not exists nocap_person_notes_place_created_idx on public.nocap_person_notes (place_id, created_at desc);

alter table public.nocap_profiles enable row level security;
alter table public.nocap_reviews enable row level security;
alter table public.nocap_person_notes enable row level security;

drop policy if exists "Public NoCap profiles are readable" on public.nocap_profiles;
create policy "Public NoCap profiles are readable" on public.nocap_profiles for select using (true);
drop policy if exists "Public NoCap reviews are readable" on public.nocap_reviews;
create policy "Public NoCap reviews are readable" on public.nocap_reviews for select using (true);
drop policy if exists "Public NoCap person notes are readable" on public.nocap_person_notes;
create policy "Public NoCap person notes are readable" on public.nocap_person_notes for select using (true);

-- Browser clients may authenticate with Google, but writes only happen through
-- the server endpoint after it validates a fresh device position against the place.
drop policy if exists "No direct NoCap profile writes" on public.nocap_profiles;
create policy "No direct NoCap profile writes" on public.nocap_profiles for all using (false) with check (false);
drop policy if exists "No direct NoCap review writes" on public.nocap_reviews;
create policy "No direct NoCap review writes" on public.nocap_reviews for all using (false) with check (false);
drop policy if exists "No direct NoCap person note writes" on public.nocap_person_notes;
create policy "No direct NoCap person note writes" on public.nocap_person_notes for all using (false) with check (false);
