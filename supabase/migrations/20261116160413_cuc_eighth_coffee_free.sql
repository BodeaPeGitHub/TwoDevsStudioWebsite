-- Seven paid coffees unlock the eighth, free coffee. There were no CUC members
-- when this rule was introduced, so no existing balances are reset or converted.
alter table public.cuc_members alter column reward_threshold set default 7;
alter table public.cuc_program_settings alter column threshold set default 7;
update public.cuc_program_settings
set threshold = 7,
    asset_base = 'https://www.twodevsstudio.com/cuc/wallet/v4',
    updated_at = now()
where id = 'program';
