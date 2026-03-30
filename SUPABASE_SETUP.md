# Supabase Setup

1. Open Supabase SQL Editor and run:
   - `supabase/setup.sql`
2. Confirm these tables exist:
   - `contact_messages`
   - `feature_requests`
   - `feature_votes`
3. Confirm the vote RPC exists:
   - `cast_feature_vote(feature_id bigint, voter_key text)`
4. In this project, set env vars in `.env.local`:

```bash
VITE_SUPABASE_URL=https://ancecjivjjmnegfdfnro.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

5. Start the site:

```bash
npm run dev
```

Notes:
- Do not use the direct Postgres connection string in frontend code.
- Do not expose your Supabase service role key in frontend code.
- The website should only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
