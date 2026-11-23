# CUC Coffee Club

Admin password policy (2026-11-20): the user selected `secure` for every program and future setup. The password remains stored as CUC's own salted hash; existing staff sessions were invalidated when it changed. CUC continues operating independently of the stopped IBRIC site, including notifications through `server/ibric/push-handler.js`.

Customer page: `/cuc`. Staff panel: `/cuc/admin`. Default reward: buy 7 coffees, receive the 8th coffee free. Staff scan the customer's Wallet QR to add purchases, redeem rewards, correct balances, or send messages. Redemption starts a new cycle at zero.

The page uses the official logo from [CUC's website](https://cuc.srl/), linked there to [@cuc.space](https://www.instagram.com/cuc.space/). Its address is Strada Napoca 5, Cluj-Napoca. The approved artwork removes the surrounding decorative curves and places the official CUC logo in cream on the central mug. Every supported progress image uses this design. The stamp artwork uses CUC's burgundy and pale yellow palette. `scripts/generate-cuc-art.mjs` creates all 495 progress images for supported thresholds 1–30, plus logo formats and editable SVG examples. Generated files are served by this Vercel project under `/cuc/`; there is no external artwork host.

## Shared mechanics, separate shops

Both programs use the backend in `server/ibric/` and the customer/staff React components in `src/ibric/`. `api/cuc.js` sets a fixed CUC context using AsyncLocalStorage. Table and RPC names are bound to that context when obtaining the database client. Request bodies and query strings cannot choose a shop. The existing `/api/ibric` endpoint continues to default to IBRIC.

CUC uses separate `cuc_` tables and RPCs, a separate staff password, session signing secret and cookies, member cookies, browser storage keys, service worker scope, VAPID keys, notification queues and Wallet class. CUC accounts start with `CUC-`; Google object identifiers start with `<issuer>.cuc_`. No IBRIC memberships, credentials, or balances are copied. A customer can hold both cards independently.

The default CUC Wallet class is `<GOOGLE_WALLET_ISSUER_ID>.cuc_coffee_club_v1`. It is created idempotently when preparing the first CUC pass. `CUC_GOOGLE_WALLET_CLASS_ID` can override it, but cannot equal the IBRIC class. The existing issuer and service account credentials are reused. Google publishing access and notification rules still apply.

CUC inherits IBRIC's transactional ledger, request deduplication, revision checks, per-member Wallet synchronization leases, staff-triggered automatic retries, individual messages, class-wide promotions and optional browser notifications. Wallet retries resume while the relevant staff view is open; browser notifications have a separate persistent queue recovered by Supabase Cron through `/api/cuc-push`. The enrollment checkbox stays visible in unsupported browsers, with an explanation; permission is requested only when the customer opts in. Notification delivery remains controlled by Google and the phone/browser settings.

## Operations

Use only the linked `two-devs-studio-website` Vercel project (`prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV`). Application data remains in Supabase project `ancecjivjjmnegfdfnro`. The CUC migration adds only new CUC tables/functions and a CUC notification schedule. RLS is enabled; browser roles have no table access or RPC execution grants. The Vercel service key performs server operations.

`node scripts/configure-cuc.mjs` generates stable CUC session/push secrets, configures their Vercel Production variables, and saves the initial staff password in the ignored `.vercel/cuc-admin-access.txt` file with mode 0600. The script also saves the staff credential hash and secret values in `.vercel/cuc-secrets.json`. Initialize `cuc_admin_credentials` with that file's `credential` object, without overwriting an existing row, and store `env.CUC_PUSH_WORKER_SECRET` in Supabase Vault as `cuc_web_push_worker_secret`. These initialization steps were applied for this installation. Never commit either file, replace established VAPID keys, or copy IBRIC staff credentials. Staff can change their password in **Program & acces**.

`CUC_WALLET_ASSET_ORIGIN` defaults to `https://www.twodevsstudio.com/cuc/wallet/v5`. The settings row uses the same URL and background `#FEFFED`. Asset paths are versioned and immutable; use a new URL version for future artwork changes.

No tests or local validation commands were run, following the project instructions.
