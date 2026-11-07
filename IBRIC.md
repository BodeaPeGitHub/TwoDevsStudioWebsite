# IBRIC Coffee Club

Customer page: `/ibric`. Protected staff panel: `/ibric/admin`.

The customer page contains the IBRIC logo, a card preview and a single action. The button creates or reopens the browser’s membership and redirects to Google Wallet for confirmation. New cards use “Membru IBRIC”; an existing member’s name and balance are preserved.

The frontend uses the same-origin Vercel function in `api/ibric.js`. It forwards only approved operations to the existing private IBRIC Sites backend. Membership, password hashes, coffee transactions and program settings remain in the existing D1 database; Google credentials remain on that backend.

## First access

Use the generated staff password at `/ibric/admin`. Change it in **Program & acces** using the current password. Password changes invalidate previous sessions; sessions expire after 8 hours. Staff access does not use ChatGPT sign-in.

Vercel requires these server-only Production environment variables: `IBRIC_BACKEND_URL`, `IBRIC_BACKEND_SERVICE_TOKEN`, `IBRIC_BRIDGE_TOKEN`. No Google service-account key belongs in this repository or in browser variables. Existing VITE_SUPABASE variables belong to the other Studio pages and must be preserved.

## Use at the counter

Search by name/card number or scan the customer's Wallet QR. Add the number of purchased coffees, then redeem a free coffee when the threshold is reached. Redemption resets the balance after explicit confirmation. Corrections require a reason and remain in the member's history. Pending Wallet updates can be retried without crediting the purchase again. Do not create a new request to resolve a pending synchronization; use its retry control.

The notification selector supports native point-update notifications, a message with notification, or silent updates. Individual messages have a review step. Google's notification limits, device settings and synchronization control delivery, including when Wallet is already open. No foreground popup is guaranteed. The issuer is still in Demo Mode; only approved test accounts can save and TEST ONLY remains until Google grants publishing access.

Program name/color changes update the shared Wallet class. Threshold changes apply to new members. Public GitHub artwork must exist for every stamp count of a new threshold before it is used.

## Local development

`vercel dev` runs the Vite app and API function using the linked project's environment. Vite alone runs only the UI and cannot execute the server function. Use server-only local environment variables; never expose bridge credentials via VITE_.
