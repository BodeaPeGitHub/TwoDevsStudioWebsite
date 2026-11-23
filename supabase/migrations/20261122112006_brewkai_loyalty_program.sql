-- Independent Brewkai program; existing programs and the IBRIC shutdown are unchanged.
-- BREWKAI is a separate loyalty program. No IBRIC rows or staff credentials are copied.

-- Server-only BREWKAI tables. Existing Studio tables are untouched.
create table public.brewkai_members (
 id uuid primary key, access_token_hash text not null unique, account_id text not null unique,
 first_name text, wallet_object_id text not null unique, stamp_count integer not null default 0,
 revision integer not null default 0, reward_threshold integer not null default 7 check (reward_threshold between 1 and 30),
 created_at timestamptz not null, check (stamp_count between 0 and reward_threshold)
);
create table public.brewkai_admin_credentials (
 id text primary key check (id='owner'), salt text not null, password_hash text not null,
 revision integer not null default 1, updated_at timestamptz not null
);
create table public.brewkai_program_settings (
 id text primary key check (id='program'), program_name text not null,
 threshold integer not null default 7 check (threshold between 1 and 30),
 asset_base text not null, background text not null default '#F9E7CB', updated_at timestamptz not null
);
create table public.brewkai_operations (
 id uuid primary key, member_id uuid not null references public.brewkai_members(id), kind text not null,
 before_balance integer not null, after_balance integer not null, before_revision integer not null default 0,
 status text not null default 'pending', notification_mode text not null default 'off',
 notification_status text not null default 'not_requested', payload jsonb not null default '{}'::jsonb,
 actor text not null, error text, created_at timestamptz not null, updated_at timestamptz not null
);
create unique index brewkai_one_pending_change on public.brewkai_operations(member_id)
 where status <> 'synced' and kind in ('purchase','redeem','adjust','profile');
create index brewkai_member_history on public.brewkai_operations(member_id,created_at desc);
create index brewkai_member_creation on public.brewkai_members(created_at desc,id);
create table public.brewkai_rate_limits (key text primary key,count integer not null default 0,expires_at bigint not null);
create index brewkai_rate_expiration on public.brewkai_rate_limits(expires_at);
create table public.brewkai_broadcasts (
 id uuid primary key, header text not null, body text not null, notify boolean not null,
 status text not null default 'pending',notification_status text not null default 'not_requested',error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.brewkai_members enable row level security;
alter table public.brewkai_admin_credentials enable row level security;
alter table public.brewkai_program_settings enable row level security;
alter table public.brewkai_operations enable row level security;
alter table public.brewkai_rate_limits enable row level security;
alter table public.brewkai_broadcasts enable row level security;
revoke all on public.brewkai_members,public.brewkai_admin_credentials,public.brewkai_program_settings,public.brewkai_operations,public.brewkai_rate_limits,public.brewkai_broadcasts from public,anon,authenticated;
grant select,insert,update,delete on public.brewkai_members,public.brewkai_admin_credentials,public.brewkai_program_settings,public.brewkai_operations,public.brewkai_rate_limits,public.brewkai_broadcasts to service_role;

create function public.brewkai_rate_limit(p_key text,p_maximum integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_now bigint:=extract(epoch from now())::bigint;v_count integer;
begin
 if p_seconds<1 or p_maximum<1 then raise exception 'invalid_limit';end if;
 insert into public.brewkai_rate_limits(key,count,expires_at) values(p_key||':'||(v_now/p_seconds)::text,1,v_now+p_seconds)
 on conflict(key) do update set count=public.brewkai_rate_limits.count+1 returning count into v_count;
 if random()<0.02 then delete from public.brewkai_rate_limits where expires_at<v_now;end if;
 return v_count<=p_maximum;
end $$;

-- Commit balance + ledger in one short transaction, before any Google HTTP call.
create function public.brewkai_record_operation(p_id uuid,p_member_id uuid,p_kind text,p_revision integer,p_after integer,p_mode text,p_payload jsonb,p_actor text)
returns public.brewkai_operations language plpgsql security invoker set search_path='' as $$
declare v_member public.brewkai_members;v_op public.brewkai_operations;
begin
 select * into v_member from public.brewkai_members where id=p_member_id for update;
 if not found then raise exception 'member_not_found';end if;
 select * into v_op from public.brewkai_operations where id=p_id;
 if found then
  if v_op.member_id<>p_member_id or v_op.kind<>p_kind then raise exception 'operation_conflict';end if;
  return v_op;
 end if;
 if p_kind not in ('purchase','redeem','adjust','profile','message') or p_mode not in ('off','update','message') then raise exception 'invalid_operation';end if;
 if v_member.revision<>p_revision then raise exception 'member_conflict';end if;
 if p_after<0 or p_after>v_member.reward_threshold then raise exception 'balance_conflict';end if;
 if p_kind='purchase' and (p_after<=v_member.stamp_count or p_after-v_member.stamp_count>30) then raise exception 'balance_conflict';end if;
 if p_kind='redeem' and (v_member.stamp_count<v_member.reward_threshold or p_after<>0) then raise exception 'balance_conflict';end if;
 if p_kind in ('profile','message') and p_after<>v_member.stamp_count then raise exception 'balance_conflict';end if;
 insert into public.brewkai_operations(id,member_id,kind,before_balance,after_balance,before_revision,notification_mode,payload,actor,created_at,updated_at)
 values(p_id,p_member_id,p_kind,v_member.stamp_count,p_after,v_member.revision,p_mode,p_payload,p_actor,now(),now()) returning * into v_op;
 if p_kind<>'message' then
  update public.brewkai_members set stamp_count=p_after,revision=revision+1,
  first_name=case when p_kind='profile' then nullif(p_payload->>'name','') else first_name end where id=p_member_id;
 end if;
 return v_op;
end $$;

create function public.brewkai_change_password(p_expected_revision integer,p_salt text,p_hash text)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_revision integer;
begin
 update public.brewkai_admin_credentials set salt=p_salt,password_hash=p_hash,revision=revision+1,updated_at=now()
 where id='owner' and revision=p_expected_revision returning revision into v_revision;
 if not found then raise exception 'credential_conflict';end if;
 return v_revision;
end $$;

create function public.brewkai_member_list(p_query text default '',p_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('members',coalesce((select jsonb_agg(to_jsonb(m)) from (
 select a.*,(select count(*) from public.brewkai_operations o where o.member_id=a.id and o.status<>'synced') pending_count
 from public.brewkai_members a where p_query='' or position(lower(p_query) in lower(coalesce(a.first_name,'')))>0
 or position(lower(p_query) in lower(a.account_id))>0 or a.wallet_object_id=p_query
 order by a.created_at desc,a.id limit 26 offset greatest(0,least(10000,p_offset))) m),'[]'::jsonb),
 'stats',(select jsonb_build_object('members',count(*),'coffees',coalesce(sum(stamp_count),0),'rewards',count(*) filter(where stamp_count>=reward_threshold)) from public.brewkai_members));
$$;
revoke all on function public.brewkai_rate_limit(text,integer,integer),public.brewkai_record_operation(uuid,uuid,text,integer,integer,text,jsonb,text),public.brewkai_change_password(integer,text,text),public.brewkai_member_list(text,integer) from public,anon,authenticated;
grant execute on function public.brewkai_rate_limit(text,integer,integer),public.brewkai_record_operation(uuid,uuid,text,integer,integer,text,jsonb,text),public.brewkai_change_password(integer,text,text),public.brewkai_member_list(text,integer) to service_role;

-- A failed Google request must not prevent subsequent purchases or corrections.
-- The operation ID and member revision still protect against duplicate/stale edits.
drop index if exists public.brewkai_one_pending_change;

-- Lease only the external Wallet write, never the member's saved balance.
-- Existing RLS and service-role-only grants on brewkai_members remain in force.
alter table public.brewkai_members
  add column wallet_sync_token uuid,
  add column wallet_sync_expires_at timestamptz;

-- Google permits duplicate message IDs. Serialize message reconciliation and
-- capacity management per object/class, separately from fast balance updates.
create table public.brewkai_wallet_message_locks (
 resource text primary key,
 token uuid not null,
 expires_at timestamptz not null
);
alter table public.brewkai_wallet_message_locks enable row level security;
revoke all on public.brewkai_wallet_message_locks from public,anon,authenticated;
grant select,insert,update,delete on public.brewkai_wallet_message_locks to service_role;

-- Browser subscriptions and a durable delivery outbox. Access is server-only.
create table public.brewkai_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.brewkai_members(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null, auth text not null, application_server_key text not null,
  active boolean not null default true,
  consent_version text not null default 'brewkai-offers-v1',
  consent_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brewkai_push_member on public.brewkai_push_subscriptions(member_id);

create table public.brewkai_push_campaigns (
  id uuid primary key,
  header text not null check (length(header) between 1 and 60),
  body text not null check (length(body) between 1 and 1000),
  member_id uuid references public.brewkai_members(id) on delete cascade,
  actor text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index brewkai_push_campaign_member on public.brewkai_push_campaigns(member_id);
create index brewkai_push_campaign_created on public.brewkai_push_campaigns(created_at desc);

create table public.brewkai_push_deliveries (
  campaign_id uuid not null references public.brewkai_push_campaigns(id) on delete cascade,
  subscription_id uuid not null references public.brewkai_push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','accepted','failed','skipped','expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz,
  error text, accepted_at timestamptz,
  primary key (campaign_id, subscription_id)
);
create index brewkai_push_delivery_subscription on public.brewkai_push_deliveries(subscription_id);
create index brewkai_push_delivery_due on public.brewkai_push_deliveries(next_attempt_at)
  where status in ('pending','sending');

alter table public.brewkai_push_subscriptions enable row level security;
alter table public.brewkai_push_campaigns enable row level security;
alter table public.brewkai_push_deliveries enable row level security;
revoke all on public.brewkai_push_subscriptions, public.brewkai_push_campaigns, public.brewkai_push_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.brewkai_push_subscriptions, public.brewkai_push_campaigns, public.brewkai_push_deliveries to service_role;

-- Repeated requests reuse the original audience and never enqueue twice.
create function public.brewkai_enqueue_push(p_id uuid, p_header text, p_body text, p_member uuid, p_actor text, p_key text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_campaign public.brewkai_push_campaigns; v_inserted uuid;
begin
  insert into public.brewkai_push_campaigns(id, header, body, member_id, actor)
  values (p_id, p_header, p_body, p_member, p_actor)
  on conflict (id) do nothing returning id into v_inserted;
  select * into strict v_campaign from public.brewkai_push_campaigns where id = p_id;
  if v_campaign.header <> p_header or v_campaign.body <> p_body or v_campaign.member_id is distinct from p_member then
    raise exception 'push_payload_conflict';
  end if;
  if v_inserted is not null then
    insert into public.brewkai_push_deliveries(campaign_id, subscription_id)
    select p_id, id from public.brewkai_push_subscriptions
    where active and application_server_key = p_key and (p_member is null or member_id = p_member);
    if not found then raise exception 'push_no_subscribers'; end if;
  end if;
  return p_id;
end $$;

create function public.brewkai_claim_push(p_token uuid, p_limit integer default 5)
returns setof public.brewkai_push_deliveries language sql security invoker set search_path = '' as $$
  with candidates as (
    select campaign_id, subscription_id from public.brewkai_push_deliveries
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'sending' and lease_until <= now())
    order by next_attempt_at, campaign_id, subscription_id
    limit greatest(1, least(p_limit, 5)) for update skip locked
  )
  update public.brewkai_push_deliveries d set status = 'sending', attempts = d.attempts + 1,
    lease_token = p_token, lease_until = now() + interval '3 minutes'
  from candidates c where d.campaign_id = c.campaign_id and d.subscription_id = c.subscription_id
  returning d.*;
$$;

-- Only aggregate delivery state is returned to the staff browser, never endpoints or keys.
create function public.brewkai_push_overview(p_key text)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'subscribers', (select count(*) from public.brewkai_push_subscriptions where active and application_server_key = p_key),
    'campaigns', coalesce((select jsonb_agg(to_jsonb(c)) from (
      select c.id, c.header, c.body, c.member_id as "memberId", c.created_at as "createdAt",
        count(d.subscription_id) as total,
        count(*) filter (where d.status = 'accepted') as accepted,
        count(*) filter (where d.status in ('pending','sending')) as pending,
        count(*) filter (where d.status = 'failed') as failed,
        count(*) filter (where d.status in ('skipped','expired')) as skipped
      from (select * from public.brewkai_push_campaigns order by created_at desc limit 30) c
      left join public.brewkai_push_deliveries d on d.campaign_id = c.id
      group by c.id, c.header, c.body, c.member_id, c.created_at
      order by c.created_at desc
    ) c), '[]'::jsonb)
  );
$$;

revoke all on function public.brewkai_enqueue_push(uuid,text,text,uuid,text,text),
  public.brewkai_claim_push(uuid,integer), public.brewkai_push_overview(text) from public, anon, authenticated;
grant execute on function public.brewkai_enqueue_push(uuid,text,text,uuid,text,text),
  public.brewkai_claim_push(uuid,integer), public.brewkai_push_overview(text) to service_role;

-- A confirmed Google object can be reopened with a locally signed save link.
-- NULL for legacy members until Google confirms an insert or an existing object.
alter table public.brewkai_members add column wallet_created_at timestamptz;

insert into public.brewkai_program_settings(id,program_name,threshold,asset_base,background,updated_at)
values ('program','Brewkai Coffee Club',7,'https://www.twodevsstudio.com/brewkai/wallet/v1','#F9E7CB',now());

-- Reuse the existing extensions; wake only the BREWKAI Vercel worker.
select cron.schedule('brewkai-web-push-deliveries', '* * * * *', $job$
  select net.http_get(
    url := 'https://www.twodevsstudio.com/api/brewkai-push',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (
      select decrypted_secret from vault.decrypted_secrets where name = 'brewkai_web_push_worker_secret'
    )),
    timeout_milliseconds := 80000
  )
  where exists (
    select 1 from public.brewkai_push_deliveries
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'sending' and lease_until <= now())
  )
  and exists (select 1 from vault.decrypted_secrets where name = 'brewkai_web_push_worker_secret');
$job$);
