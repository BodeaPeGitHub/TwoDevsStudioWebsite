-- Browser subscriptions and a durable delivery outbox. Access is server-only.
create table public.ibric_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.ibric_members(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null, auth text not null, application_server_key text not null,
  active boolean not null default true,
  consent_version text not null default 'ibric-offers-v1',
  consent_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ibric_push_member on public.ibric_push_subscriptions(member_id);

create table public.ibric_push_campaigns (
  id uuid primary key,
  header text not null check (length(header) between 1 and 60),
  body text not null check (length(body) between 1 and 1000),
  member_id uuid references public.ibric_members(id) on delete cascade,
  actor text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index ibric_push_campaign_member on public.ibric_push_campaigns(member_id);
create index ibric_push_campaign_created on public.ibric_push_campaigns(created_at desc);

create table public.ibric_push_deliveries (
  campaign_id uuid not null references public.ibric_push_campaigns(id) on delete cascade,
  subscription_id uuid not null references public.ibric_push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','accepted','failed','skipped','expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz,
  error text, accepted_at timestamptz,
  primary key (campaign_id, subscription_id)
);
create index ibric_push_delivery_subscription on public.ibric_push_deliveries(subscription_id);
create index ibric_push_delivery_due on public.ibric_push_deliveries(next_attempt_at)
  where status in ('pending','sending');

alter table public.ibric_push_subscriptions enable row level security;
alter table public.ibric_push_campaigns enable row level security;
alter table public.ibric_push_deliveries enable row level security;
revoke all on public.ibric_push_subscriptions, public.ibric_push_campaigns, public.ibric_push_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.ibric_push_subscriptions, public.ibric_push_campaigns, public.ibric_push_deliveries to service_role;

-- Repeated requests reuse the original audience and never enqueue twice.
create function public.ibric_enqueue_push(p_id uuid, p_header text, p_body text, p_member uuid, p_actor text, p_key text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_campaign public.ibric_push_campaigns; v_inserted uuid;
begin
  insert into public.ibric_push_campaigns(id, header, body, member_id, actor)
  values (p_id, p_header, p_body, p_member, p_actor)
  on conflict (id) do nothing returning id into v_inserted;
  select * into strict v_campaign from public.ibric_push_campaigns where id = p_id;
  if v_campaign.header <> p_header or v_campaign.body <> p_body or v_campaign.member_id is distinct from p_member then
    raise exception 'push_payload_conflict';
  end if;
  if v_inserted is not null then
    insert into public.ibric_push_deliveries(campaign_id, subscription_id)
    select p_id, id from public.ibric_push_subscriptions
    where active and application_server_key = p_key and (p_member is null or member_id = p_member);
    if not found then raise exception 'push_no_subscribers'; end if;
  end if;
  return p_id;
end $$;

create function public.ibric_claim_push(p_token uuid, p_limit integer default 5)
returns setof public.ibric_push_deliveries language sql security invoker set search_path = '' as $$
  with candidates as (
    select campaign_id, subscription_id from public.ibric_push_deliveries
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'sending' and lease_until <= now())
    order by next_attempt_at, campaign_id, subscription_id
    limit greatest(1, least(p_limit, 5)) for update skip locked
  )
  update public.ibric_push_deliveries d set status = 'sending', attempts = d.attempts + 1,
    lease_token = p_token, lease_until = now() + interval '3 minutes'
  from candidates c where d.campaign_id = c.campaign_id and d.subscription_id = c.subscription_id
  returning d.*;
$$;

-- Only aggregate delivery state is returned to the staff browser, never endpoints or keys.
create function public.ibric_push_overview(p_key text)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'subscribers', (select count(*) from public.ibric_push_subscriptions where active and application_server_key = p_key),
    'campaigns', coalesce((select jsonb_agg(to_jsonb(c)) from (
      select c.id, c.header, c.body, c.member_id as "memberId", c.created_at as "createdAt",
        count(d.subscription_id) as total,
        count(*) filter (where d.status = 'accepted') as accepted,
        count(*) filter (where d.status in ('pending','sending')) as pending,
        count(*) filter (where d.status = 'failed') as failed,
        count(*) filter (where d.status in ('skipped','expired')) as skipped
      from (select * from public.ibric_push_campaigns order by created_at desc limit 30) c
      left join public.ibric_push_deliveries d on d.campaign_id = c.id
      group by c.id, c.header, c.body, c.member_id, c.created_at
      order by c.created_at desc
    ) c), '[]'::jsonb)
  );
$$;

revoke all on function public.ibric_enqueue_push(uuid,text,text,uuid,text,text),
  public.ibric_claim_push(uuid,integer), public.ibric_push_overview(text) from public, anon, authenticated;
grant execute on function public.ibric_enqueue_push(uuid,text,text,uuid,text,text),
  public.ibric_claim_push(uuid,integer), public.ibric_push_overview(text) to service_role;
