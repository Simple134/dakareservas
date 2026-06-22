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

**Next.js 16 App Router** real estate investment management platform for Daka Dominicana (`reservas.dakadominicana.com`). Two external data sources drive the entire app:

1. **Supabase** — auth, real-time, and relational data (reservations, locales, profiles, payments)
2. **Gestiono** — external financial API for invoices/accounting (proxied server-side)

### Route Structure

| Route                                                | Purpose                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `app/page.tsx`                                       | Kiosk display — shows real-time sale notifications via Supabase Realtime |
| `app/login/`                                         | Auth entry                                                               |
| `app/admin/`                                         | Full admin dashboard (role-gated)                                        |
| `app/admin/projects/[id]/`                           | Project detail with financial modules                                    |
| `app/user/[id]/`                                     | Client investment view                                                   |
| `app/api/gestiono/`                                  | Server-side proxy for all Gestiono API calls                             |
| `app/formulario/`                                    | Client intake form                                                       |
| `app/seleccion-producto/` + `app/confirmacion/[id]/` | Sales funnel                                                             |

### Auth Flow

`AuthContext` (`src/context/AuthContext.tsx`) wraps the app. On load it calls `supabase.auth.getUser()` and fetches role from the `profiles` table. Role is either `"admin"` or `"user"`.

- Admins redirect to `/admin`
- Users redirect to `/user/[id]`

Both pages guard themselves with a `roleLoaded` check before rendering — avoid rendering role-gated content until `roleLoaded === true`.

### Gestiono API Layer

All Gestiono calls must go through Next.js API routes. **Never call Gestiono directly from client components.**

- `src/lib/gestiono/client.ts` — HMAC-SHA256 signed request client (`gestionoRequest`, `gestionoFormRequest`)
- `src/lib/gestiono/endpoints.ts` — typed wrappers around every Gestiono endpoint
- `app/api/gestiono/` — Next.js route handlers that call the endpoint wrappers

Request signing: GET requests sign query params; POST/PATCH/DELETE sign the body. The signature goes in the `Authorization` header.

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

- `generateInvoicePDF.ts`, `generateQuotePDF.ts` — for Gestiono invoices/quotes
- `generateCuentasPorCobrarPDF.ts`, `generateCuentasPorPagarPDF.ts` — for accounts modules

Tax rate constants are in `lib/taxRates.ts`. Dominican Republic taxes: ITBIS 18%/16%, ISC 10%, CDT 2%. ISR retention (10%) is applied on vendor invoices.

### Key Domain Concepts

- **locales** — commercial units (Supabase table), each has level, area, price, status
- **persona_fisica / persona_juridica** — individual vs. corporate buyers
- **product_allocations** — reservations linking a buyer to a product; `status: "approved"` triggers the kiosk celebration animation
- **PendingRecord** — Gestiono's term for an invoice/quote/order; `isSell: true` = sales invoice, `isSell: false` = purchase
- **GestionoDivision** — a Gestiono "project" (maps 1:1 to a Supabase project via `divisionId`)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GESTIONO_API_URL        # https://api.gestiono.app
NEXT_PUBLIC_GESTIONO_ORGANIZATION_ID
GESTIONO_API_PUBLIC_KEY             # server-only
GESTIONO_API_PRIVATE_KEY            # server-only (used for HMAC signing)
RESEND_API_KEY                      # for email actions in src/actions/
NEXT_PUBLIC_SITE_URL
```

### Styling

Tailwind CSS v4 is the primary styling approach. Bootstrap 5 is also imported globally (legacy) — prefer Tailwind for new work. Brand gold color: `#A9780F`. Dark background: `#131E29`.

The `src/components/ui/` components follow shadcn/ui patterns with `clsx` + `tailwind-merge` via `src/lib/utils.ts`.
