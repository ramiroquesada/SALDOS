# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Nuestras Finanzas** — family finance web app for couples. Mobile-first, daily-use, shared data between two users.

## Development Status

### ✅ Fase 1 — Completada (2026-04-04)

Todo el código está implementado y commiteado. **Falta conectar la base de datos real:**

1. Completar `.env.local` con credenciales reales de Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (connection pooler, puerto 6543, `?pgbouncer=true`)
   - `DIRECT_URL` (direct connection, puerto 5432)
2. Correr `npx prisma migrate dev --name init` para crear las tablas
3. Configurar Google OAuth en Supabase Dashboard → callback URL: `{APP_URL}/auth/callback`

**Lo que está funcionando en código:**
- Google OAuth flow completo con sync a Prisma (crear User + Family en primer login)
- Middleware protege `/dashboard/*` → redirige a `/auth/login` si no autenticado
- CRUD de gastos variables: crear, listar por mes, eliminar
- Selector de mes en URL (`?month=YYYY-MM`)
- Layout mobile con Header + BottomNav (6 tabs)
- Tests de utilidades pasando (`npm test`)

### ⏳ Fase 2 — Pendiente

Gastos Fijos + Ingresos + Dashboard con balance real.
- `/dashboard/fixed` — gastos fijos con toggle paid/unpaid
- `/dashboard/income` — ingresos por miembro
- `/dashboard` — balance del mes: ingresos - gastos variables - gastos fijos + resumen por categoría

### ⏳ Fase 3 — Pendiente

Ahorro + Presupuesto + Invitar pareja.
- `/dashboard/savings` — meta de ahorro con barra de progreso
- `/dashboard/budget` — límites por categoría con alertas semafóricas
- `/invite/[code]` — página pública para que la pareja se una a la familia

## Stack

- **Next.js 15 App Router** — fullstack monorepo (frontend + API en un proyecto)
- **React 19 + Tailwind CSS 4** — UI, mobile-first
- **Prisma 7.6** — ORM; cliente generado en `src/generated/prisma` (importar con `@/generated/prisma`)
- **PostgreSQL via Supabase** — managed database con row-level security
- **Supabase Auth** — Google OAuth only (no passwords)
- **TypeScript** — end-to-end typing
- **Vercel** — deployment

## Common Commands

```bash
npm run dev                          # Start dev server
npx next dev --hostname 0.0.0.0     # Dev server accessible from phone on LAN
npm run build && npm run start       # Production build
npm test                             # Run utility tests (Vitest)

npx prisma migrate dev --name <name> # Create and apply migration
npx prisma generate                  # Regenerate Prisma client after schema changes
npx prisma studio                    # Browse database visually
```

## Prisma Notes

- Version: **7.6.0**
- Generated client lives in `src/generated/prisma/` — always import from `@/generated/prisma`, not `@prisma/client`
- `prisma.config.ts` at project root handles `DATABASE_URL` and `DIRECT_URL` — no need to add them to `schema.prisma`

## Architecture

```
Browser (React) → Server Components / Server Actions → Prisma → PostgreSQL (Supabase)
                                                          ↑
                                              Supabase Auth (Google OAuth)
```

- **Server Components** for dashboard and read-heavy pages — read Prisma directly, no fetch/useEffect
- **Server Actions** (`src/actions/`) for all mutations — validate auth, call `src/lib/db/*`, revalidate path
- **No API Route Handlers** for now — logic lives in `actions/` and `lib/db/`
- **Next.js Middleware** protects all `/dashboard/*` routes — redirect unauthenticated users to `/auth/login`
- Data is always scoped to a `familyId` — never query without it
- Monthly data is segmented by `month: "YYYY-MM"` string (e.g. `"2026-04"`) — all queries filter by this field

## Codebase Structure (implemented)

```
src/
├── __tests__/utils.test.ts          # Vitest tests for utility functions
├── actions/
│   └── expenses.ts                  # Server Actions: createExpense, deleteExpense
├── app/
│   ├── page.tsx                     # Root redirect (auth → /dashboard, no auth → /auth/login)
│   ├── layout.tsx                   # Root layout (Geist font, lang="es")
│   ├── globals.css                  # Global styles + Tailwind CSS 4
│   ├── auth/
│   │   ├── login/page.tsx           # Login page with Google button
│   │   └── callback/route.ts        # OAuth callback → sync Prisma User+Family
│   └── dashboard/
│       ├── layout.tsx               # Dashboard shell: wraps children + BottomNav
│       ├── page.tsx                 # Dashboard home (placeholder, Fase 2)
│       └── expenses/page.tsx        # Expenses list + form (Fase 1 ✅)
├── components/
│   ├── auth/GoogleLoginButton.tsx   # Client component: Supabase OAuth trigger
│   ├── expenses/
│   │   ├── ExpenseForm.tsx          # Client: form to add a new expense
│   │   └── ExpenseList.tsx          # Client: list with delete button per item
│   ├── layout/
│   │   ├── BottomNav.tsx            # Client: 6-tab fixed bottom navigation
│   │   ├── Header.tsx               # Server: sticky header with title + MonthSelector
│   │   └── MonthSelector.tsx        # Client: prev/next month buttons (modifies URL)
│   └── ui/
│       ├── Button.tsx               # Primitive: primary/ghost/danger, sm/md/lg, loading
│       ├── Card.tsx                 # Primitive: white rounded card
│       └── Input.tsx                # Primitive: labeled input with error state
├── generated/prisma/                # Auto-generated Prisma client (DO NOT EDIT)
├── lib/
│   ├── auth.ts                      # requireAuth() → { userId, familyId, userName }
│   ├── constants.ts                 # VARIABLE_CATEGORIES, FIXED_CATEGORIES, CATEGORY_COLORS
│   ├── db/
│   │   └── expenses.ts              # Pure Prisma queries: get/create/delete expenses
│   ├── prisma.ts                    # PrismaClient singleton
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   └── server.ts                # Server Supabase client (SSR cookies)
│   └── utils.ts                     # formatMoney, getMonthKey, formatMonthLabel, cn, prevMonth, nextMonth
├── types/index.ts                   # Expense, CreateExpenseInput
middleware.ts                        # Protects /dashboard/*, redirects /auth/login if logged in
```

## Data Model Key Points

- `User` belongs to one `Family`; all financial records belong to `Family`, not `User`
- `spentBy` / `earnedBy` are resolved to the user's display name at record creation
- `inviteCode` on `Family` is a UUID used to generate invite links for the partner
- `month` field indexes (`@@index([familyId, month])`) are present on Expense, FixedExpense, Income, and Budget — always include both in queries

## Auth Flow

1. Google OAuth via Supabase Auth
2. On first login: create `User` + `Family` records
3. Partner joins via `/invite/[code]` → links their `User` to existing `Family`
4. Supabase server client (`src/lib/supabase/server.ts`) for route handlers/middleware; browser client (`src/lib/supabase/client.ts`) for client components

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL                    # Supabase PostgreSQL connection string
NEXT_PUBLIC_APP_URL
```

## UI Conventions

- **Language**: code in English, UI text in Rioplatense Spanish
- **Mobile-first**: bottom navigation bar (6 tabs), large touch targets, numeric inputs for money
- **Color palette**: dark navy header (`#1a1a2e` / `#16213e`), light content area (`#f5f6fa`)
- **Money display**: monospace font; use `formatMoney()` from `src/lib/utils.ts`
- **Progress bars**: green → yellow (80%) → red (100%) using semaphore coloring
- Emojis used as iconography throughout the UI

## Feature Modules

| Route | Module |
|-------|--------|
| `/dashboard` | Balance overview, category breakdown, savings widget |
| `/dashboard/expenses` | Variable daily expenses |
| `/dashboard/fixed` | Recurring monthly fixed expenses with paid/unpaid toggle |
| `/dashboard/income` | Income tracking for both members |
| `/dashboard/savings` | Single savings goal with progress bar |
| `/dashboard/budget` | Per-category monthly budget limits with alerts |

## Expense Categories

**Variable**: Supermercado, Farmacia, Transporte, Comida afuera, Ropa, Bebé, Salud, Hogar, Ocio, Otro

**Fixed**: Alquiler, UTE (Luz), OSE (Agua), Internet, Celular, Seguro, Mutualista, Otro

Canonical category lists live in `src/lib/constants.ts`.
