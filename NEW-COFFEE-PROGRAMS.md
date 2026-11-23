# Let's Coffee, ORSO and GUAU!

Each program awards the eighth coffee free after seven purchases. Redeeming the reward starts a new cycle at zero. The user-approved artwork has no city label and has seven ordinary stamp positions plus a highlighted free-coffee position.

| Program | Customers | Staff |
| --- | --- | --- |
| Let's Coffee | `/letscoffee` | `/letscoffee/admin` |
| ORSO | `/orso` | `/orso/admin` |
| GUAU! | `/guau` | `/guau/admin` |

`/lets-coffee` and `/lets-coffee/admin` redirect to the canonical Let's Coffee pages.

## Isolation from existing shops

The original `server/ibric/`, `src/ibric/`, `api/ibric*`, `api/cuc*`, `public/ibric/` and `public/cuc/` implementations are unchanged. The three new shops use a separate engine in `server/coffee/` and separate React components in `src/coffee/`, adapted from the existing implementation. Styles use the `coffee-` prefix so they cannot restyle the existing IBRIC or CUC components. Existing routes and Vercel settings are preserved; only new routes, functions and headers are added.

Every new API entry point binds a fixed AsyncLocalStorage context. Missing or unknown contexts fail closed. Request input cannot choose another shop. Tables, functions, credentials, session signatures, cookies, browser storage keys, service-worker scopes, notification queues, VAPID keys and Google Wallet identifiers are separate per program. No existing memberships, balances, credentials or notification audiences are copied.

The table/RPC prefixes are `letscoffee_`, `orso_` and `guau_`. All tables have RLS enabled; browser roles have no table or RPC grants. Only the existing Vercel backend service role accesses application data. Shared Google issuer/service-account credentials are reused, with distinct `<issuer>.<slug>_coffee_club_v1` Wallet classes and `<issuer>.<slug>_<uuid>` objects. There are no class overrides that can accidentally select another new shop; conflicting existing CUC or IBRIC class identifiers disable Wallet configuration.

The transactional purchase/redeem ledger, request deduplication, revisions, Wallet synchronization leases, direct messages, broadcasts, retry behavior, staff password management and optional browser notifications follow the existing mechanics. The reward threshold is fixed at seven in these new programs. Staff can correct balances, redeem earned rewards, change names and change their own password.

## Assets and deployment

`scripts/generate-new-coffee-art.mjs` formats the approved imagegen artwork and renders eight deterministic progress states for each shop. The source image is preserved at `public/<slug>/assets/approved-card-v2.png`. Wallet assets are hosted by this Vercel project under `/<slug>/wallet/v1/art/v2/`. Published versioned directories are immutable; use a new version for future artwork changes.

Use only the linked `two-devs-studio-website` Vercel project (`prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV`) and Supabase project `ancecjivjjmnegfdfnro`. Google Wallet is called directly from Vercel. No legacy Sites deployment is used or reactivated.

The new-program migration adds only the three new shops' tables/functions, settings and Cron jobs. Notification workers run on Vercel in Stockholm. Each Supabase Cron job wakes only its corresponding worker when jobs are due and its Vault secret exists. Deploying and initializing the programs does not enqueue or send any notifications.

`scripts/configure-new-coffee.mjs` generates and retains independent session/push secrets and staff passwords in ignored mode-0600 files under `.vercel/`. Running with `--environment` adds only the new environment-variable names, never overwriting existing values. Running with `--database` initializes only missing new-shop credential/Vault entries using the already linked Studio Supabase project. Completed setup steps are recorded for safe resumption. Never commit `.vercel/`, regenerate established VAPID keys or copy existing staff credentials.

Initial staff URLs/passwords are saved privately in `.vercel/new-coffee-admin-access.txt`. Staff can change the passwords under **Program & acces**.

On 2026-11-20 the user requested `secure` as the admin password for every current and future program. Each program still has its own salted password hash, credential revision, signing secret and staff session. `scripts/set-admin-password.mjs` applies this setting atomically, invalidates previous staff sessions and pauses only IBRIC's notification job. It preserves customer data, balances and existing session/VAPID secrets. Setup scripts use the same chosen default. IBRIC's application entry points are now disabled; CUC and these three programs remain active.

`scripts/prepare-new-coffee-wallet.mjs` signs in to each new program's own staff API and saves its seven-coffee settings/design. The Vercel backend creates or updates only that shop's Google Wallet class. Existing production Google and service-role credentials stay in Vercel. The setup script signs out after each program; it does not create test members or make purchases.

Production deployment: `dpl_2NK6WyTbJYT6eZhc7oRFScM5TrfV`, aliased to `https://www.twodevsstudio.com`. The Vercel production build completed successfully.

No tests or local validation commands were run, following the project instructions. A production deployment runs the build required by Vercel. Google controls Wallet publishing status, refresh timing and phone notification delivery.
