-- ==============================================================================
-- NoCapBLR Feedback Board Schema
-- Tables: public.nocap_feedback, public.nocap_feedback_votes
-- ==============================================================================

create table if not exists public.nocap_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.nocap_profiles(id) on delete set null,
  author_name text not null default 'Anonymous',
  author_email text,
  author_avatar text,
  category text not null check (category in ('feature', 'bug', 'improvement', 'other')),
  title text not null,
  description text not null,
  status text not null default 'under_review' check (status in ('under_review', 'planned', 'in_progress', 'completed', 'closed')),
  upvotes_count integer not null default 1,
  device_info text,
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nocap_feedback_votes (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.nocap_feedback(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (feedback_id, voter_id)
);

create index if not exists nocap_feedback_upvotes_idx on public.nocap_feedback (upvotes_count desc, created_at desc);
create index if not exists nocap_feedback_status_idx on public.nocap_feedback (status);
create index if not exists nocap_feedback_category_idx on public.nocap_feedback (category);
create index if not exists nocap_feedback_votes_idx on public.nocap_feedback_votes (feedback_id, voter_id);

alter table public.nocap_feedback enable row level security;
alter table public.nocap_feedback_votes enable row level security;

drop policy if exists "Public feedback is readable" on public.nocap_feedback;
create policy "Public feedback is readable" on public.nocap_feedback for select using (true);

drop policy if exists "Public feedback votes are readable" on public.nocap_feedback_votes;
create policy "Public feedback votes are readable" on public.nocap_feedback_votes for select using (true);

drop policy if exists "No direct feedback writes" on public.nocap_feedback;
create policy "No direct feedback writes" on public.nocap_feedback for all using (false) with check (false);

drop policy if exists "No direct feedback vote writes" on public.nocap_feedback_votes;
create policy "No direct feedback vote writes" on public.nocap_feedback_votes for all using (false) with check (false);
