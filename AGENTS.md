# Project instructions

## Hosting and publishing

- All application changes must be committed and pushed to this GitHub repository before publication. Start from the latest upstream branch and preserve other user changes. Use the existing Vercel GitHub integration for production; never publish an uncommitted or separate local copy.

- Use only the existing Two Devs Studio Vercel project for hosting and publishing. Use its GitHub integration or the Vercel CLI.
- Do not use ChatGPT Sites, Pages, the Sites plugin, Cloudflare Pages/Workers hosting, Netlify, or any other publishing platform for this project, including previews.
- Run the website and backend API on Vercel. Store application data in Supabase. Call Google Wallet directly from the Vercel backend.
- Do not introduce a Sites proxy, ChatGPT-hosted backend, or a dependency on a `chatgpt.site` URL. Do not reactivate legacy Sites deployments as part of the application.
- Both legacy IBRIC Sites deployments (the app and the artwork host) have been retired: every route returns HTTP 410, and the old app's runtime credentials have been removed. Never restore or republish either legacy application.

## Admin access

- The user's chosen default admin password is `secure` for every loyalty program, including future program setup. Store it using the existing salted password hash; never bypass authentication or share sessions between programs.

## IBRIC shutdown

- The user requested that the current Vercel IBRIC customer site, staff panel, API and notification worker be stopped. Keep those entry points disabled unless the user explicitly requests reactivation.
- Preserve IBRIC customer data and card balances. Keep CUC and the other programs independent and operational; CUC must not import the disabled IBRIC notification entry point.

## Testing

- Do not run tests unless the user explicitly asks for tests or validation commands.
