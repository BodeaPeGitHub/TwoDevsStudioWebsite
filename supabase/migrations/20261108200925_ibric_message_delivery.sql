-- Google permits duplicate message IDs. Serialize message reconciliation and
-- capacity management per object/class, separately from fast balance updates.
create table public.ibric_wallet_message_locks (
 resource text primary key,
 token uuid not null,
 expires_at timestamptz not null
);
alter table public.ibric_wallet_message_locks enable row level security;
revoke all on public.ibric_wallet_message_locks from public,anon,authenticated;
grant select,insert,update,delete on public.ibric_wallet_message_locks to service_role;
