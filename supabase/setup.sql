-- Run this entire script once in Supabase SQL Editor.

create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text,
  email text,
  type text not null default 'General feedback',
  message text not null,
  created_at timestamptz not null default now(),
  constraint contact_messages_message_len check (char_length(message) between 5 and 4000),
  constraint contact_messages_email_len check (email is null or char_length(email) <= 255),
  constraint contact_messages_name_len check (name is null or char_length(name) <= 120)
);

create table if not exists public.feature_requests (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  status text not null default 'under_review',
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  constraint feature_requests_title_len check (char_length(title) between 3 and 200),
  constraint feature_requests_status_check check (
    status in ('under_review', 'planned', 'in_progress', 'done')
  ),
  constraint feature_requests_votes_non_negative check (votes >= 0)
);

create table if not exists public.feature_votes (
  id bigint generated always as identity primary key,
  feature_id bigint not null references public.feature_requests(id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  constraint feature_votes_voter_key_len check (char_length(voter_key) between 8 and 120),
  constraint feature_votes_unique unique (feature_id, voter_key)
);

drop trigger if exists trg_feature_votes_counter on public.feature_votes;
drop function if exists public.sync_feature_vote_counter();

create or replace function public.cast_feature_vote(feature_id bigint, voter_key text)
returns table (votes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.feature_votes (feature_id, voter_key)
  values (feature_id, voter_key)
  on conflict do nothing
  returning 1 into inserted;

  if inserted is null then
    raise exception 'duplicate_vote';
  end if;

  update public.feature_requests
  set votes = votes + 1
  where id = feature_id
  returning feature_requests.votes into votes;

  return next;
end;
$$;

alter table public.contact_messages enable row level security;
alter table public.feature_requests enable row level security;
alter table public.feature_votes enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.feature_requests to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.feature_votes to anon, authenticated;
grant execute on function public.cast_feature_vote(bigint, text) to anon, authenticated;

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists feature_requests_select_public on public.feature_requests;
create policy feature_requests_select_public
on public.feature_requests
for select
to anon, authenticated
using (true);

drop policy if exists feature_requests_insert_public on public.feature_requests;
create policy feature_requests_insert_public
on public.feature_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists feature_votes_insert_public on public.feature_votes;
create policy feature_votes_insert_public
on public.feature_votes
for insert
to anon, authenticated
with check (true);

drop policy if exists feature_votes_delete_none on public.feature_votes;
create policy feature_votes_delete_none
on public.feature_votes
for delete
to anon, authenticated
using (false);

-- Optional seed rows for faster testing:
insert into public.feature_requests (title, description, status)
values
  ('Google Calendar sync', 'Sync interview reminders with Google Calendar.', 'planned'),
  ('Interview notes templates', 'Quick templates for preparing and storing interview notes.', 'under_review')
on conflict do nothing;

-- Force API schema cache refresh so new tables are immediately visible.
select pg_notify('pgrst', 'reload schema');
