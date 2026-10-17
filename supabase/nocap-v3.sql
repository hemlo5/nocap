-- NoCap v3 migration
-- Run this in Supabase SQL editor:
-- 1. Allow reviews without star ratings (simple text/notes)
-- 2. Allow custom and 'other' categories for user-pinned places

-- Relax rating not-null constraint on nocap_reviews
alter table public.nocap_reviews
  alter column rating drop not null;

alter table public.nocap_reviews
  drop constraint if exists nocap_reviews_rating_check;

alter table public.nocap_reviews
  add constraint nocap_reviews_rating_check
  check (rating is null or (rating between 1 and 5));

-- Relax category check on nocap_user_places to allow 'other' and custom category names
alter table public.nocap_user_places
  drop constraint if exists nocap_user_places_category_check;

alter table public.nocap_user_places
  add constraint nocap_user_places_category_check
  check (char_length(trim(category)) between 1 and 60);

