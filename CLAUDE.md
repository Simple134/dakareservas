# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start dev server at localhost:3000
yarn build        # Production build
yarn lint         # ESLint check
yarn type         # TypeScript check (npx tsc --noEmit)
yarn format       # Prettier formatting
```

No test suite is configured in this project.

## Architecture Overview

**Next.js 16 App Router** real estate investment management platform for Daka Dominicana (`reservas.dakadominicana.com`).

**Supabase is the single source of truth** — auth, real-time, and all relational data:
the sales funnel (reservations, locales, profiles, payments) and the ERP
(divisions/projects, invoices, invoice lines, taxes, beneficiaries, resources).

The app previously read its financial data from Gestiono, an external API. That
dependency was removed in August 2026: the historical data was migrated into Postgres
and every endpoint now resolves against Supabase. The one-shot migration tooling lives
in `scripts/etl/` and is the only place that still talks to the old API.

### Route Structure

| Route                                                | Purpose                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `app/page.tsx`                                       | Kiosk display — shows real-time sale notifications via Supabase Realtime  |
| `app/login/`                                         | Auth entry                                                                |
| `app/admin/`                                         | Full admin dashboard (role-gated)                                         |
| `app/admin/projects/[id]/`                           | Project detail with financial modules                                     |
| `app/user/[id]/`                                     | Client investment view                                                    |
| `app/api/erp/`                                       | Server-side ERP endpoints (invoices, beneficiaries, divisions, resources) |
| `app/formulario/`                                    | Client intake form                                                        |
| `app/seleccion-producto/` + `app/confirmacion/[id]/` | Sales funnel                                                              |

### Auth Flow

`AuthContext` (`src/context/AuthContext.tsx`) wraps the app. On load it calls `supabase.auth.getUser()` and fetches role from the `profiles` table. Role is either `"admin"` or `"user"`.

- Admins redirect to `/admin`
- Users redirect to `/user/[id]`

Both pages guard themselves with a `roleLoaded` check before rendering — avoid rendering role-gated content until `roleLoaded === true`.

### ERP Data Layer

All ERP data access is server-side. **Never import `src/lib/supabase/admin.ts` from a
client component** — it uses the service-role key and bypasses RLS.

- `src/lib/erp/endpoints.ts` — the API the route handlers consume
- `src/lib/data/` — `records.ts` (documents), `entities.ts` (beneficiaries, divisions,
  resources, taxes, appData), `files.ts` (Supabase Storage), `mappers.ts` (Postgres rows
  → the shape the UI expects)
- `app/api/erp/` — Next.js route handlers

Money is `numeric` in Postgres, never float. Totals, the derived invoice `state` and the
ISR retention all come from the `pending_records_computed` view — that view is the single
source of truth, so don't recompute them in components.

Filtering, pagination and the `resume` aggregate are resolved by the
`search_pending_records` Postgres function. Writes that must be atomic
(`create_pending_record`, `pay_pending_record`, `create_from_pending_record`,
`next_fiscal_numeral`) are Postgres functions too.

Verification scripts in `scripts/etl/`: `reconcile.mjs` (totals and states against the
migrated source), `smoke.mjs` (functional writes, creates and cleans up after itself).

### Component Organization

```
src/components/
  dashboard/     # Admin overview: DashboardView, KPICard, CreateInvoice, PayInvoiceModal, etc.
  project/       # Project detail tabs: FinancesModule, BudgetModule, CuentasPorCobrar/PagarModule, PersonnelModule, MaterialsModule
  projects/      # LocalesSection (units), ClientesSection (buyers)
  charts/        # Chart.js / Recharts wrappers
  ui/            # Radix-based primitives (shadcn-style)
```

### PDF Generation

PDF files live in `lib/` (root-level, not `src/lib/`):

- `generateInvoicePDF.ts`, `generateQuotePDF.ts` — for ERP invoices/quotes
- `generateCuentasPorCobrarPDF.ts`, `generateCuentasPorPagarPDF.ts` — for accounts modules

Tax rate constants are in `lib/taxRates.ts`. Dominican Republic taxes: ITBIS 18%/16%, ISC 10%, CDT 2%. ISR retention (10%) is applied on vendor invoices.

### Key Domain Concepts

- **locales** — commercial units (Supabase table), each has level, area, price, status
- **persona_fisica / persona_juridica** — individual vs. corporate buyers
- **product_allocations** — reservations linking a buyer to a product; `status: "approved"` triggers the kiosk celebration animation
- **PendingRecord** — an invoice, quote or order; `isSell: true` = sale, `isSell: false` = purchase.
  Serialized to the UI with `isSell` as `0`/`1`, not boolean — several components compare
  with `=== 0` / `=== 1`
- **Division** — a project. The `[id]` in `/admin/projects/[id]` _is_ the division id;
  project metadata (client, status, budget, budgetCategories…) lives in `divisions.metadata`

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY           # server-only; required, the app refuses to boot without it
RESEND_API_KEY                      # for email actions in src/actions/
NEXT_PUBLIC_SITE_URL
API_AUTH_REQUIRED                   # optional; "true" makes proxy.ts guard /api/erp/*
```

The `GESTIONO_*` variables are no longer read by the app. `scripts/etl/` still needs them
if the migration tooling is ever re-run.

### Styling

Tailwind CSS v4 is the primary styling approach. Bootstrap 5 is also imported globally (legacy) — prefer Tailwind for new work. Brand gold color: `#A9780F`. Dark background: `#131E29`.

The `src/components/ui/` components follow shadcn/ui patterns with `clsx` + `tailwind-merge` via `src/lib/utils.ts`.
