# Ciclo

Personal expense tracker PWA. Single user, no login, no backend — all data lives
in IndexedDB via Dexie.js. Budgeting runs on a custom cycle (default: 21st of
the month to the 20th of the next), configurable in Definições (Settings).

## Stack

React + Vite + TypeScript + Tailwind + Dexie.js + Recharts.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL on your phone (same Wi-Fi) or desktop browser, then
"Add to Home Screen" / install as an app.

## Build

```bash
npm run build
npm run preview
```

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

## Backup

Definições → Exportar JSON / Importar JSON. Import fully replaces local data,
so export first if in doubt.
