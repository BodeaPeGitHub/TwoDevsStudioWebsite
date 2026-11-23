-- A failed Google request must not prevent subsequent purchases or corrections.
-- The operation ID and member revision still protect against duplicate/stale edits.
drop index if exists public.ibric_one_pending_change;

-- Lease only the external Wallet write, never the member's saved balance.
-- Existing RLS and service-role-only grants on ibric_members remain in force.
alter table public.ibric_members
  add column wallet_sync_token uuid,
  add column wallet_sync_expires_at timestamptz;
