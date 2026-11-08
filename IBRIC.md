# IBRIC Coffee Club

Customer page: `/ibric`. Staff panel: `/ibric/admin`.

## Hosting

The React frontend and `api/ibric.js` run on Vercel. The API executes the backend in `server/ibric/` directly. Supabase Postgres stores memberships, password hashes, settings, rate limits, transactions and promotions. Google Wallet is called directly from Vercel. There is no Sites proxy, Cloudflare D1 binding or ChatGPT login dependency.

The Studio Supabase project is `ancecjivjjmnegfdfnro`. All IBRIC tables use the `ibric_` prefix, have RLS enabled and deny browser roles. Only the Vercel server key can access them. Existing Studio tables remain separate.

## Server configuration

Configure Production variables from `.env.example` in Vercel. `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, and `IBRIC_SESSION_SECRET` are server secrets and must never have a `VITE_` prefix. The existing public VITE_SUPABASE variables serve other Studio pages and are preserved.

The customer button creates or reopens the browser's membership and redirects to Google Wallet. Reopening never resets points. Existing card identifiers, member cookies, balances and password hashes were migrated unchanged. Staff sessions can be re-established with the same password. Change it in **Program & acces**.

## Transactions and notifications

`ibric_record_operation` locks a member briefly and commits its balance and ledger entry together. It validates the revision and prevents more than one pending balance change per member. Google synchronization happens after that transaction. The retry control uses the same operation ID and never credits another purchase. Failed synchronizations remain in history for retry. There is no automatic points adjustment during deployment.

Individual messages and class-wide promotions have stable request IDs and stored delivery state. Google controls notification delivery and Wallet refresh timing; a foreground popup is not guaranteed. Demo Mode remains until Google grants publishing access.

The migration is in `supabase/migrations/`. Imported customer data and credentials are never committed. Supabase migrations and D1 imports do not send messages or change existing Wallet objects.

## Development

`vercel dev` runs both the UI and server function. Plain `vite` serves only the frontend. Keep local server secrets in an ignored environment file or process environment.
