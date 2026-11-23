# Two Devs Studio website

## Loyalty programs and Git deployment

This repository includes CUC, Let's Coffee, ORSO, GUAU and Brewkai alongside the Studio pages and BTarena/Cluj Arena seat explorers. IBRIC remains disabled. Production is the existing Two Devs Studio Vercel project, deployed automatically from this repository's `main` branch. Commit and push source changes before publishing; do not deploy a separate local copy.

Loyalty frontend, API, artwork, dependencies and Supabase migrations are tracked here. Private `.vercel` configuration, passwords, signing keys and environment files stay out of Git. Production database/settings and Vercel secrets are already configured: a normal Git deployment must not reset credentials, reapply migrations or recreate members.

See `CUC.md`, `NEW-COFFEE-PROGRAMS.md`, `BREWKAI.md` and `IBRIC.md` for program details. Approved raster sources are under `artwork-source/`; published immutable Wallet artwork is under `public/<program>/wallet/`. For an intentional future database setup, link this checkout with `supabase link --project-ref ancecjivjjmnegfdfnro` first.
