# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Nuestras Finanzas** — family finance web app for couples. Mobile-first, daily-use, shared data between two users.

## Stack

- **Next.js 14+ App Router** — fullstack monorepo (frontend + API in one project)
- **React 19 + Tailwind CSS 4** — UI, mobile-first
- **Prisma** — ORM with typed migrations
- **PostgreSQL via Supabase** — managed database with row-level security
- **Supabase Auth** — Google OAuth only (no passwords)
- **TypeScript** — end-to-end typing
- **Vercel** — deployment

## Common Commands

```bash
npm run dev                          # Start dev server
npx next dev --hostname 0.0.0.0     # Dev server accessible from phone on LAN
npm run build && npm run start       # Production build

npx prisma migrate dev --name <name> # Create and apply migration
npx prisma generate                  # Regenerate Prisma client after schema changes
npx prisma studio                    # Browse database visually
```

## Architecture

```
Browser (React) → Next.js API Routes → Prisma → PostgreSQL (Supabase)
                                         ↑
                             Supabase Auth (Google OAuth)
```

- **Server Components** for dashboard and read-heavy pages
- **Server Actions** or **Route Handlers** for mutations (create expense, etc.)
- **Next.js Middleware** protects all `/dashboard/*` routes — redirect unauthenticated users to `/auth/login`
- Data is always scoped to a `familyId` — never query without it
- Monthly data is segmented by `month: "YYYY-MM"` string (e.g. `"2026-04"`) — all queries filter by this field

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
