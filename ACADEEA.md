# Acadeea Club

Customer page: `/acadeea`. Staff panel: `/acadeea/admin`. Acadeea uses the project-wide default admin password, stored as its own salted PBKDF2 hash, and a separate staff-session signing secret.

The rule is seven purchased coffees followed by a free eighth coffee. The varied coffee, cookie and croissant stamp icons are decorative; they do not change the reward rule. Redemption restarts the cycle at zero. The approved source is `artwork-source/acadeea/acadeea-card-v7.png`, with no cutting board or reward lettering. The last circle stays pink. `scripts/generate-acadeea-art.mjs` formats only Acadeea's logos and eight progress images, preserving the approved raster and adding native stamp overlays as purchases accumulate.

The existing `src/coffee/` and `server/coffee/` engine handles enrollment, Google Wallet, staff administration and notifications. The fixed `api/acadeea.js` entry point always binds the Acadeea request context. Tables and RPCs use the `acadeea_` prefix; member codes use `ACADEEA-`; member/staff cookies, browser storage, service-worker scope, VAPID keys, staff credentials and notification audiences are separate from every other program. RLS is enabled on every new table and browser roles have no direct table/RPC access. No other program's members or balances are copied or changed.

Acadeea's notification worker shares its fixed-scope function with its API. `/api/acadeea-push` rewrites to `/api/acadeea?route=worker`, where the existing worker handler requires Acadeea's own bearer secret. The redundant retired IBRIC push function is replaced with a rewrite to the existing retired IBRIC handler, keeping `/api/ibric-push` disabled with HTTP 410 and keeping the deployment within 12 functions. CUC continues to use its existing independent push entry point.

The migration creates only Acadeea's tables, RPCs, settings and conditional notification schedule. Its version matches the applied Supabase migration. Link the checkout to the existing Supabase and Vercel projects before intentional first-time setup:

```sh
node scripts/configure-new-coffee.mjs --program acadeea --environment --database
node scripts/prepare-new-coffee-wallet.mjs --program acadeea
```

The scoped setup preserves established secrets and never overwrites existing credentials. The Wallet setup saves the real Acadeea class configuration through the Vercel backend and signs out; it creates no test member or purchase. Private setup state stays in the ignored `.vercel` directory. A normal Git deployment must not rerun migrations or initialize credentials.

Google Wallet class: `<issuer>.acadeea_coffee_club_v1`. Object IDs: `<issuer>.acadeea_<uuid>`. Current artwork: `/acadeea/wallet/v1/art/v3/`. Version `v2` is preserved unchanged. Version `v3` uses the official transparent wordmark and cupcake favicon from Acadeea's website, avoiding a textured rectangle in the header and the unrelated cup icon in the Passes list. Source URLs are recorded in `artwork-source/acadeea/brand/SOURCES.md`. The approved card illustration and all stamp balances remain intact.

The Acadeea template shows one concise progress label instead of combining it with a second reward-threshold label. Google controls the native/web layout: the web viewer places the full-size hero artwork below the card content, so a short screenshot may show only its upper edge. The image is published at Google's recommended 1032×812 dimensions. Do not crop it to a narrow banner to try to move it above the QR code.

After deploying an intentional design update, refresh only Acadeea's existing Wallet objects through its authenticated backend, preserving balances and account IDs:

```sh
node scripts/prepare-new-coffee-wallet.mjs --program acadeea --refresh-design
```

The versioned published assets should be treated as immutable. Google controls issuer approval, Wallet refresh timing and notification delivery.

Publish only by committing and pushing this repository to the existing Vercel GitHub integration. No tests or local validation commands are required or run unless the user requests them. IBRIC remains stopped; its data is preserved.
