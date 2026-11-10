-- ==============================================================================
-- NoCapBLR: Image Attachments for Notes & Dedicated Person Notes Schema
-- ==============================================================================

-- 1. Support image attachments on reviews and notes
alter table if exists public.nocap_reviews
  add column if not exists image_url text;

-- 2. Dedicated person notes table for dots / places
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

-- Index for speedy retrieval by place
create index if not exists nocap_person_notes_place_created_idx 
  on public.nocap_person_notes (place_id, created_at desc);

-- Row Level Security
alter table public.nocap_person_notes enable row level security;

drop policy if exists "Public NoCap person notes are readable" on public.nocap_person_notes;
create policy "Public NoCap person notes are readable" 
  on public.nocap_person_notes for select using (true);

drop policy if exists "No direct NoCap person note writes" on public.nocap_person_notes;
create policy "No direct NoCap person note writes" 
  on public.nocap_person_notes for all using (false) with check (false);
