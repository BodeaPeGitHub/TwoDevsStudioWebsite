-- A confirmed Google object can be reopened with a locally signed save link.
-- NULL for legacy members until Google confirms an insert or an existing object.
alter table public.ibric_members add column wallet_created_at timestamptz;
