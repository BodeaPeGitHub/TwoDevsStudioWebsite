-- Cron only wakes the existing Vercel backend. No application backend runs here.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- The scheduler runs as postgres. Browser roles must not enqueue arbitrary HTTP requests.
revoke all on schema net from public, anon, authenticated;
revoke all on all functions in schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;

select cron.schedule('ibric-web-push-deliveries', '* * * * *', $job$
  select net.http_get(
    url := 'https://www.twodevsstudio.com/api/ibric-push',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (
      select decrypted_secret from vault.decrypted_secrets where name = 'ibric_web_push_worker_secret'
    )),
    timeout_milliseconds := 80000
  )
  where exists (
    select 1 from public.ibric_push_deliveries
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'sending' and lease_until <= now())
  )
  and exists (select 1 from vault.decrypted_secrets where name = 'ibric_web_push_worker_secret');
$job$);
