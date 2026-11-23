# IBRIC Coffee Club

Stopped at the user's request on 2026-11-20. The customer site, staff panel, API and push-worker entry points return HTTP 410. The IBRIC notification Cron job is paused. Customer data, balances and Google Wallet objects are preserved. Do not reactivate without an explicit user request.

CUC remains operational and imports the shared push implementation from `server/ibric/push-handler.js` directly, independently of the disabled IBRIC API entry point. The implementation notes below remain as a reference for the shared engine.

Customer page: `/ibric`. Staff panel: `/ibric/admin`.

The same implementation also powers the independent CUC program at `/cuc`; see [CUC.md](./CUC.md). The default backend/frontend context remains IBRIC, preserving its existing identifiers, cookie names, session signatures and table names.

## Hosting

The React frontend and `api/ibric.js` run on Vercel. The API executes the backend in `server/ibric/` directly. Supabase Postgres stores memberships, password hashes, settings, rate limits, transactions and promotions. Google Wallet is called directly from Vercel. There is no Sites proxy, Cloudflare D1 binding or ChatGPT login dependency.

The Studio Supabase project is `ancecjivjjmnegfdfnro`. All IBRIC tables use the `ibric_` prefix, have RLS enabled and deny browser roles. Only the Vercel server key can access them. Existing Studio tables remain separate.

## Server configuration

Configure Production variables from `.env.example` in Vercel. `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, and `IBRIC_SESSION_SECRET` are server secrets and must never have a `VITE_` prefix. The existing public VITE_SUPABASE variables serve other Studio pages and are preserved.

The customer page automatically prepares or reopens the browser's membership and Google object through POST `prepare`. Program settings and the membership are read concurrently. The prepared save URL is kept in page memory, so **Vreau cardul meu** immediately opens Wallet without an extra enrollment step. Google still requires the customer to confirm saving. In-flight requests are shared across React mounts; browsers with Web Locks also serialize preparation across tabs to reuse the membership cookie.

`ibric_members.wallet_created_at` records a confirmed Google insert or HTTP 409 (already exists). Confirmed cards only require locally signing a short save link: no Google OAuth, insert, or GET occurs when reopening them. Legacy records start with a null timestamp and are confirmed once on their next visit. New cards are created automatically while the page is opening; Google's first creation can still take several seconds. Failed preparation is retryable with the same membership cookie. Reopening never resets points. Existing card identifiers, member cookies, balances and password hashes were migrated unchanged. Staff sessions can be re-established with the same password. Change it in **Program & acces**.

## Transactions and notifications

`ibric_record_operation` locks a member briefly and commits its balance and ledger entry together. It validates the revision and allows further edits even if Google is temporarily unavailable. Google synchronization happens after that transaction. A two-minute per-member lease serializes Wallet writes while purchases continue to commit. Synchronization always reads the latest saved balance and name. It sends a small native-points PATCH first, then a separate PATCH for changed artwork and detail fields, and resolves all covered ledger entries only after both succeed. Request IDs still prevent duplicate purchases. The staff panel automatically retries unfinished synchronization while the member is selected; each new edit also synchronizes earlier saved edits. No manual Wallet retry is needed. There is no automatic points adjustment during deployment.

Individual messages and class-wide promotions have stable request IDs and stored delivery state. Balance PATCH requests use `notifyPreference: "NOTIFY_ON_UPDATE"`, the documented `NotificationSettingsForUpdates` enum (`NOTIFY` is invalid). Notification quota failures fall back to the same PATCH without the preference, so the balance still updates. Google controls notification delivery and Wallet refresh timing, including when the card is already open; there is no issuer API that forces an immediate foreground redraw or popup. See [pass updates](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/updates), [notification settings](https://developers.google.com/wallet/reference/rest/v1/NotificationSettingsForUpdates), and [push notifications](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications). Demo Mode remains until Google grants publishing access.

The migration is in `supabase/migrations/`. Imported customer data and credentials are never committed. Supabase migrations and D1 imports do not send messages or change existing Wallet objects.

## Notification delivery

Direct messages use `loyaltyObject/{id}/addMessage`; club-wide promotions use `loyaltyClass/{id}/addMessage`. Checked notification controls request `TEXT_AND_NOTIFY`; unchecked controls use `TEXT`. Google displays message text in card details. Tapping an Android notification opens the card and the View Message callout. Google and the customer's Wallet/card notification settings determine whether and when the phone shows an alert. API acceptance is not a device-delivery receipt, and the staff UI labels it accordingly.

The documented limit is three message notifications per pass in 24 hours; field-update notifications are also limited by Google. A notification-quota error is reconciled against the stored Google message before retrying as silent `TEXT`. General API rate-limit errors remain retryable and are not misreported as notification quota. A recovered message's actual `messageType` determines its status, rather than the original requested mode. A balance notification's result is persisted before artwork processing so an image retry cannot erase it or request another alert.

Google permits duplicate message IDs, so IDs alone do not provide idempotency. Server-only, expiring rows in `ibric_wallet_message_locks` serialize message reads, capacity management and additions per Google object/class; per-operation leases still prevent concurrent retries of the same ledger row. Google accepts at most ten messages per object or class. When full, the code retires an older IBRIC-owned message only after its ledger row is synchronized; messages awaiting reconciliation and messages from other sources are preserved. The database retains retired message content and history.

Promotion history is available through GET `admin/broadcasts`. The staff panel retries unfinished promotions with POST `admin/broadcasts/:id/retry` while the Promotions tab is open, including after a page reload. Retries keep the original promotion ID and payload; a new-message rate limit does not charge ordinary recovery attempts. Direct messages continue automatic recovery while their member is selected. No background job runs after the staff panel is closed.

References: [Google's notification guide](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications), [message types and ID semantics](https://developers.google.com/wallet/reference/rest/v1/Message), [object messages](https://developers.google.com/wallet/reference/rest/v1/loyaltyobject), and [class messages](https://developers.google.com/wallet/reference/rest/v1/loyaltyclass).

## Update latency

The Wallet API function is pinned to Stockholm (`arn1`), matching the Supabase project's `eu-north-1` region. Keep this aligned if the database moves; sequential database requests across continents add latency to every change. See [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region).

Actions reuse the ledger row returned by the transaction, and Wallet sync reuses the member snapshot returned when acquiring the lease. Settings, Google OAuth, pending-operation reads and the Google object read overlap where independent. The Google GET is retained so PATCH preserves unrelated text modules. Unfinished updates retry immediately, then after 1, 2, 4, 8, 16 and up to 30 seconds while the card is selected, rather than waiting 10 seconds between early attempts. New purchases still send their update immediately within the action request.

Successful Google PATCH calls log their request and sync durations without customer identifiers. The API also returns a `Server-Timing` duration, allowing backend time to be distinguished from Google's later on-device refresh. These changes reduce issuer-side latency; they do not guarantee an immediate redraw on the phone.

The card face references `object.loyaltyPoints.balance` and `object.secondaryLoyaltyPoints.balance` directly. The primary balance is shown against the member's own `ibric-target` text module, preserving different reward thresholds. Custom progress text remains in details. The first PATCH contains the native balances and update-notification preference, without image URLs; its response is limited to the updated balance fields. A second, silent PATCH updates only changed presentation fields and never re-sends balances. Retrying a partial failure repairs the presentation without re-crediting points or requesting another balance notification.

Production artwork is served from `https://www.twodevsstudio.com/ibric/wallet/v3/art/v2/` on the existing Vercel CDN, with immutable cache headers. These versioned files must never be overwritten: use a new versioned directory for future art changes. The program's `asset_base` is `https://www.twodevsstudio.com/ibric/wallet/v3`. All existing threshold artwork (1–30) is included. Staff can refresh an existing member's presentation without a purchase using POST `admin/members/:id/sync` with `{ "refreshDesign": true }`; that maintenance path does not send pending messages.

StampMate's [public product page](https://www.stampmate.co.uk/product/stamp-cards) advertises live updates, but does not disclose its private Google Wallet backend or guarantee a Google Android refresh deadline. Native fields and small PATCH requests are supported by [Google's template guide](https://developers.google.com/wallet/retail/loyalty-cards/resources/template) and [performance guide](https://developers.google.com/wallet/retail/loyalty-cards/resources/performance-tips). A faster foreground refresh remains an expected benefit to observe on the customer's phone, not a measured guarantee.

## Browser notifications (Web Push)

Customer enrollment has an optional **Vreau oferte și noutăți IBRIC** checkbox directly above **Vreau cardul meu**. Permission is only requested when the customer checks it. Existing subscriptions appear checked; unchecking stops delivery for that browser. A collapsed **Opțiuni notificări** section allows a preview for the customer's own browser. Notification preference changes complete before the Wallet button becomes available again. Existing members use the browser that created their membership. Subscription consent covers IBRIC offers and news (`ibric-offers-v1`); creating or saving a Wallet pass alone does not opt anyone in. Supported Android browsers do not require a home-screen installation. The checkbox is omitted on unsupported browsers.

In **Promoții & Notificări**, **Notificări web** sends a custom title and body to all subscribed browsers or the selected member. Each send has a confirmation step, stable request ID, persisted recipient snapshot, and aggregate delivery history. Push-service acceptance is not a phone-delivery or read receipt. These sends are independent of Google Wallet messages and do not change loyalty balances. Notification clicks open `/ibric`. No notification is sent by deploying or migrating.

The server-only `IBRIC_PUSH_PUBLIC_KEY` and `IBRIC_PUSH_PRIVATE_KEY` variables hold a stable VAPID key pair. `/api/ibric/config` exposes only the public key. Do not regenerate the pair on deployment: existing subscriptions depend on it. `IBRIC_PUSH_WORKER_SECRET` must match the `ibric_web_push_worker_secret` secret stored in Supabase Vault. No subscription endpoints or encryption keys are returned to the staff UI or browser database roles.

Apply `20261113213702_ibric_web_push.sql`, configure the environment and Vault secret, then apply `20261114091228_ibric_web_push_schedule.sql`. The latter enables `pg_cron` and `pg_net` and schedules `ibric-web-push-deliveries` every minute. It only invokes `https://www.twodevsstudio.com/api/ibric-push` when delivery jobs are due. This supports the existing Vercel Hobby project without a frequent Vercel Cron job. The scheduler is in Supabase; notification processing and sending run on Vercel in Stockholm. Pause processing with `select cron.unschedule('ibric-web-push-deliveries');` if necessary.

The outbox uses atomic claims, three-minute leases, exponential retries for transient errors, six attempts, and a 24-hour expiry. HTTP 404/410 deactivates expired subscriptions. Notifications use stable tags and push-service topics to reduce duplicate alerts after ambiguous failures; exactly-once phone delivery is not guaranteed. Subscription state is rechecked when jobs are loaded. Unsubscribing stops subsequent jobs, but cannot recall a push already submitted to a browser push service. A service worker scoped to `/ibric` displays notifications and handles clicks without caching or intercepting requests.

Browser permissions, device settings, connectivity, cleared site data, and expired subscriptions can affect delivery. Other than the VAPID pair and a shared scheduler token, there is no external notification vendor account to configure.

## Local development

`vercel dev` runs both the UI and server function. Plain `vite` serves only the frontend. Keep local server secrets in an ignored environment file or process environment.
