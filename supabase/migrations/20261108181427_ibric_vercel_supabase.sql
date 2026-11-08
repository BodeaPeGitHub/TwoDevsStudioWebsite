-- Server-only IBRIC tables. Existing Studio tables are untouched.
create table public.ibric_members (
 id uuid primary key, access_token_hash text not null unique, account_id text not null unique,
 first_name text, wallet_object_id text not null unique, stamp_count integer not null default 0,
 revision integer not null default 0, reward_threshold integer not null default 9 check (reward_threshold between 1 and 30),
 created_at timestamptz not null, check (stamp_count between 0 and reward_threshold)
);
create table public.ibric_admin_credentials (
 id text primary key check (id='owner'), salt text not null, password_hash text not null,
 revision integer not null default 1, updated_at timestamptz not null
);
create table public.ibric_program_settings (
 id text primary key check (id='program'), program_name text not null,
 threshold integer not null default 9 check (threshold between 1 and 30),
 asset_base text not null, background text not null default '#233DA4', updated_at timestamptz not null
);
create table public.ibric_operations (
 id uuid primary key, member_id uuid not null references public.ibric_members(id), kind text not null,
 before_balance integer not null, after_balance integer not null, before_revision integer not null default 0,
 status text not null default 'pending', notification_mode text not null default 'off',
 notification_status text not null default 'not_requested', payload jsonb not null default '{}'::jsonb,
 actor text not null, error text, created_at timestamptz not null, updated_at timestamptz not null
);
create unique index ibric_one_pending_change on public.ibric_operations(member_id)
 where status <> 'synced' and kind in ('purchase','redeem','adjust','profile');
create index ibric_member_history on public.ibric_operations(member_id,created_at desc);
create index ibric_member_creation on public.ibric_members(created_at desc,id);
create table public.ibric_rate_limits (key text primary key,count integer not null default 0,expires_at bigint not null);
create index ibric_rate_expiration on public.ibric_rate_limits(expires_at);
create table public.ibric_broadcasts (
 id uuid primary key, header text not null, body text not null, notify boolean not null,
 status text not null default 'pending',notification_status text not null default 'not_requested',error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.ibric_members enable row level security;
alter table public.ibric_admin_credentials enable row level security;
alter table public.ibric_program_settings enable row level security;
alter table public.ibric_operations enable row level security;
alter table public.ibric_rate_limits enable row level security;
alter table public.ibric_broadcasts enable row level security;
revoke all on public.ibric_members,public.ibric_admin_credentials,public.ibric_program_settings,public.ibric_operations,public.ibric_rate_limits,public.ibric_broadcasts from public,anon,authenticated;
grant select,insert,update,delete on public.ibric_members,public.ibric_admin_credentials,public.ibric_program_settings,public.ibric_operations,public.ibric_rate_limits,public.ibric_broadcasts to service_role;

create function public.ibric_rate_limit(p_key text,p_maximum integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_now bigint:=extract(epoch from now())::bigint;v_count integer;
begin
 if p_seconds<1 or p_maximum<1 then raise exception 'invalid_limit';end if;
 insert into public.ibric_rate_limits(key,count,expires_at) values(p_key||':'||(v_now/p_seconds)::text,1,v_now+p_seconds)
 on conflict(key) do update set count=public.ibric_rate_limits.count+1 returning count into v_count;
 if random()<0.02 then delete from public.ibric_rate_limits where expires_at<v_now;end if;
 return v_count<=p_maximum;
end $$;

-- Commit balance + ledger in one short transaction, before any Google HTTP call.
create function public.ibric_record_operation(p_id uuid,p_member_id uuid,p_kind text,p_revision integer,p_after integer,p_mode text,p_payload jsonb,p_actor text)
returns public.ibric_operations language plpgsql security invoker set search_path='' as $$
declare v_member public.ibric_members;v_op public.ibric_operations;
begin
 select * into v_member from public.ibric_members where id=p_member_id for update;
 if not found then raise exception 'member_not_found';end if;
 select * into v_op from public.ibric_operations where id=p_id;
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
 insert into public.ibric_operations(id,member_id,kind,before_balance,after_balance,before_revision,notification_mode,payload,actor,created_at,updated_at)
 values(p_id,p_member_id,p_kind,v_member.stamp_count,p_after,v_member.revision,p_mode,p_payload,p_actor,now(),now()) returning * into v_op;
 if p_kind<>'message' then
  update public.ibric_members set stamp_count=p_after,revision=revision+1,
  first_name=case when p_kind='profile' then nullif(p_payload->>'name','') else first_name end where id=p_member_id;
 end if;
 return v_op;
end $$;

create function public.ibric_change_password(p_expected_revision integer,p_salt text,p_hash text)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_revision integer;
begin
 update public.ibric_admin_credentials set salt=p_salt,password_hash=p_hash,revision=revision+1,updated_at=now()
 where id='owner' and revision=p_expected_revision returning revision into v_revision;
 if not found then raise exception 'credential_conflict';end if;
 return v_revision;
end $$;

create function public.ibric_member_list(p_query text default '',p_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('members',coalesce((select jsonb_agg(to_jsonb(m)) from (
 select a.*,(select count(*) from public.ibric_operations o where o.member_id=a.id and o.status<>'synced') pending_count
 from public.ibric_members a where p_query='' or position(lower(p_query) in lower(coalesce(a.first_name,'')))>0
 or position(lower(p_query) in lower(a.account_id))>0 or a.wallet_object_id=p_query
 order by a.created_at desc,a.id limit 26 offset greatest(0,least(10000,p_offset))) m),'[]'::jsonb),
 'stats',(select jsonb_build_object('members',count(*),'coffees',coalesce(sum(stamp_count),0),'rewards',count(*) filter(where stamp_count>=reward_threshold)) from public.ibric_members));
$$;
revoke all on function public.ibric_rate_limit(text,integer,integer),public.ibric_record_operation(uuid,uuid,text,integer,integer,text,jsonb,text),public.ibric_change_password(integer,text,text),public.ibric_member_list(text,integer) from public,anon,authenticated;
grant execute on function public.ibric_rate_limit(text,integer,integer),public.ibric_record_operation(uuid,uuid,text,integer,integer,text,jsonb,text),public.ibric_change_password(integer,text,text),public.ibric_member_list(text,integer) to service_role;
