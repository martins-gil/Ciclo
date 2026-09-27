# FoldWise

Personal expense tracker PWA, hosted on Vercel with a Neon Postgres database.
Single shared password gate (no per-user accounts). Budgeting runs on a
custom cycle (default: 21st of the month to the 20th of the next),
configurable in Definições (Settings).

## Stack

React + Vite + TypeScript + Tailwind + Recharts on the frontend; Vercel
Serverless Functions + Prisma + Neon Postgres on the backend.

## Getting started (local development)

Requires a Neon project (free tier is fine) and the Vercel CLI.

```bash
npm install -g vercel   # once
npm install
```

Create a `.env` file in the project root (gitignored) with:
```
DATABASE_URL="<your Neon pooled connection string>"
SESSION_SECRET="<any random string>"
```
Then set (or later change) your login password with:
```bash
node scripts/set-password.cjs 'your-password'
```
This writes `ADMIN_PASSWORD_HASH` into `.env` directly — don't set that value
by hand in a shell, since bcrypt hashes contain `$` characters that
PowerShell (and some shells) will silently mangle if the value passes
through a string it interpolates.

Run the initial migration once against your Neon database:
```bash
npm run db:migrate
```

Then run the app (Vite frontend + `/api` serverless functions together):
```bash
vercel dev
```

Open the printed URL on your phone (any network — it's hosted, not local)
or desktop browser, then "Add to Home Screen" / install as an app.

## Deploying

Push to `main` — Vercel's GitHub integration builds and deploys
automatically (the build step also runs `prisma migrate deploy`, so schema
changes roll out with the code). Set `DATABASE_URL`, `SESSION_SECRET`, and
`ADMIN_PASSWORD_HASH` as environment variables in the Vercel project
settings — never commit them.

## Data model

- **Envelopes** — budget categories with a monthly cap. `passthrough` envelopes
  (e.g. Combustível) are tracked but excluded from the "real spend" total.
- **Pots** — actual money buckets (`spending`, `goal`, `buffer`), each with an
  optional target. Balances are derived from transaction history, never stored.
- **Transactions** — `spend`, `transfer`, `reimbursement_pending`,
  `reimbursement_received`, `income`. A `reimbursement_pending` transaction
  never counts against an envelope or the real-spend total; when the matching
  `reimbursement_received` income arrives you can link the two.
- **Settings** — singleton row: cycle start day, currency/locale, and a default
  base income used for the "safe to spend today" figure until you log real
  income for the current cycle.

Schema lives in `prisma/schema.prisma`; shared TypeScript types in
`src/db/types.ts`.

## Backup

Definições → Exportar JSON / Importar JSON. Import fully replaces the
database, so export first if in doubt.
