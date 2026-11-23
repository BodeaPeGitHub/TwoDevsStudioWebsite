-- Use a fresh artwork version so saved/cached cards can fetch the approved design.
-- Balances, reward rules, memberships and staff access are unchanged.
update public.cuc_program_settings
set asset_base = 'https://www.twodevsstudio.com/cuc/wallet/v5', updated_at = now()
where id = 'program';
