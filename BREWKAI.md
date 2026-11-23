# Brewkai Coffee Club

Customer page: `/brewkai`. Staff panel: `/brewkai/admin`. Admin password: `secure`, following the user's project-wide preference. The database stores Brewkai's own salted PBKDF2 hash, not the plain password. A separate signing secret and credential revision protect Brewkai's staff sessions.

The reward rule is seven purchased coffees plus the free eighth coffee. Redemption starts a new cycle at zero. The approved artwork is `artwork-source/brewkai/brewkai-card-v1.png` in this repository: lucky cat, coffee, bonsai and warm café details, without a city label. All eight progress states preserve the illustration and cat reward seal. The completed state marks the reward as available. `scripts/generate-brewkai-art.mjs` formats the logos and renders only Brewkai's progress states; it never writes another shop's artwork.

Brewkai uses the existing isolated `server/coffee/` and `src/coffee/` implementation. Fixed API entry points bind the `brewkai` request context. Its tables/RPCs have the `brewkai_` prefix; its account codes begin with `BREWKAI-`. Staff credentials, member/staff cookies, browser storage, service-worker scope, notification audience, VAPID keys and Wallet identifiers are all separate. No customers, balances or staff records are copied from another program.

The migration creates only Brewkai tables, functions, settings and its notification schedule. RLS is enabled on every table; browser roles have no table access or RPC execution grants. Only the existing Vercel service key accesses these records. The Cron job wakes only `/api/brewkai-push` when Brewkai deliveries are due. Setup and publication do not send notifications.

Hosting uses only the existing Two Devs Studio Vercel project `prj_R1ktU7jfQ5sQQP36l6tpaZQa7rWV` and Supabase project `ancecjivjjmnegfdfnro`. Google Wallet is called directly by the Vercel backend. The class identifier is `<issuer>.brewkai_coffee_club_v1`; object identifiers start with `<issuer>.brewkai_`. Artwork is served under `/brewkai/wallet/v1/art/v2/`. Treat the published versioned directory as immutable.

Setup commands, scoped to Brewkai:

```sh
node scripts/configure-new-coffee.mjs --program brewkai --environment --database
node scripts/prepare-new-coffee-wallet.mjs --program brewkai
```

The setup script generates only missing Brewkai secrets and preserves established session/VAPID keys for every program. Database initialization is tracked per program and never overwrites existing credentials. The Wallet setup signs into only Brewkai's staff API, saves its settings/design and signs out. It does not create test members or change purchases. Local access information is in the ignored `.vercel/new-coffee-admin-access.txt` file.

IBRIC remains stopped. CUC, Let's Coffee, ORSO and GUAU retain their existing routes, settings, assets and customer records.

No tests or local validation commands were run, following the project instructions. The Vercel production build runs as part of publication. Google controls publishing status, Wallet refresh timing and notification delivery.

Published on 2026-11-22 through deployment `dpl_H37C5iAbH22yQKKgVc8RRW7LhpJQ`, aliased to `https://www.twodevsstudio.com`. Vercel's production build succeeded. Brewkai's own staff API accepted the `secure` login and completed the Google Wallet class configuration; setup then signed out. No test customer memberships or purchases were created.
