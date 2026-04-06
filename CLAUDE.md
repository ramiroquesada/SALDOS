# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Nuestras Finanzas** — family finance web app for couples. Mobile-first, daily-use, shared data between two users.

## Development Status

### ✅ Fase 1 — Completada (2026-04-04)

- Google OAuth flow completo con sync a Prisma (crear User + Family en primer login)
- Middleware protege `/dashboard/*` → redirige a `/auth/login` si no autenticado
- CRUD de gastos variables: crear, listar por mes, eliminar
- Selector de mes en URL (`?month=YYYY-MM`)
- Layout mobile con Header + BottomNav (6 tabs)
- Tests de utilidades pasando (`npm test`)

### ✅ Fase 2 — Completada (2026-04-05)

- `/dashboard/fixed` — gastos fijos con toggle pagado/no pagado por ítem
- `/dashboard/income` — ingresos por miembro
- `/dashboard` — balance real del mes: ingresos − variables − fijos + breakdown por categoría

### ✅ Fase 4A — Completada (2026-04-05)

- Modelo `Category` en Prisma con seed automático de 18 categorías default al crear familia
- `/dashboard/settings` — página de configuración de categorías (variable y fijas) con ⚙️ en Header
- Formularios de gastos variables, fijos y presupuesto consumen categorías dinámicas de la DB
- `updateExpense` y `updateFixedExpense` — edición inline en `ExpenseList` y `FixedExpenseList` con per-row `useTransition`
- `ReceiptImageViewer` — lightbox overlay para ver foto de boleta (preparación para Fase 4B)
- `receiptImageUrl String?` agregado a Expense y FixedExpense en el schema

### 🔄 Fase 4B — En progreso (2026-04-06)

**Objetivo:** Scanner de boletas con Gemini 1.5 Flash. Las fotos se procesan en memoria y se descartan — no se guardan.

**Completado (Tasks 1-3):**
- `@google/generative-ai` instalado
- `src/components/receipt/compressImage.ts` — Canvas API: redimensiona a max 1200px, JPEG 0.75
- `src/app/api/receipts/scan/route.ts` — Route Handler POST: recibe FormData con imágenes, llama Gemini 1.5 Flash, retorna `{ items: [...] }`
- `src/actions/receipts.ts` — `createExpensesFromReceipt` y `createFixedExpensesFromReceipt` Server Actions

**Pendiente (Tasks 4-8):**
- Task 4: `src/components/receipt/ReceiptUploadStep.tsx` — drag & drop + thumbnails
- Task 5: `src/components/receipt/ReceiptProcessingStep.tsx` — spinner + error state
- Task 6: `src/components/receipt/ReceiptReviewStep.tsx` — lista editable + confirmar
- Task 7: `src/components/receipt/ReceiptScannerModal.tsx` + `ReceiptScannerButton.tsx`
- Task 8: Wiring en `expenses/page.tsx` y `fixed/page.tsx`

**Plan:** `docs/superpowers/plans/2026-04-06-fase4b-scanner-boletas.md`

### ✅ Fase 3 — Completada (2026-04-05)

- `/dashboard/savings` — meta de ahorro con barra de progreso, depósitos, configuración de nombre y monto
- `/dashboard/budget` — límites por categoría con semáforo (verde/amarillo/rojo), inline editing
- `/invite/[code]` — página pública para unirse a la familia (flujo autenticado y no autenticado)
- InviteCard en el dashboard con link copiable; OAuth callback soporta `?invite=CODE`

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
- Runtime uses `@prisma/adapter-pg` (PrismaPg) — required by Prisma 7's client engine
- For migrations/db push: uses `DIRECT_URL` (port 5432), not the pgbouncer pooler

## Architecture

```
Browser (React) → Server Components / Server Actions → Prisma → PostgreSQL (Supabase)
                                                          ↑
                                              Supabase Auth (Google OAuth)
```

- **Server Components** for all read pages — read Prisma directly, no fetch/useEffect
- **Server Actions** (`src/actions/`) for all mutations — validate auth, call `src/lib/db/*`, revalidate path
- **No API Route Handlers** — logic lives in `actions/` and `lib/db/`
- **Next.js Middleware** protects all `/dashboard/*` routes — redirect unauthenticated users to `/auth/login`
- Data is always scoped to a `familyId` — never query without it
- Monthly data is segmented by `month: "YYYY-MM"` string (e.g. `"2026-04"`) — all queries filter by this field

## Codebase Structure

```
src/
├── __tests__/utils.test.ts          # Vitest tests for utility functions
├── actions/
│   ├── expenses.ts                  # createExpense, deleteExpense, updateExpense
│   ├── fixed-expenses.ts            # createFixedExpense, toggleFixedExpensePaid, deleteFixedExpense, updateFixedExpense
│   ├── income.ts                    # createIncome, deleteIncome
│   ├── savings.ts                   # updateSavingsGoal, addToSavings
│   ├── budget.ts                    # setBudget, removeBudget
│   ├── categories.ts                # addCategory, removeCategory
│   └── family.ts                    # joinFamilyByCode
├── app/
│   ├── page.tsx                     # Root redirect (auth → /dashboard, no auth → /auth/login)
│   ├── layout.tsx                   # Root layout (Geist font, lang="es")
│   ├── globals.css                  # Global styles + Tailwind CSS 4
│   ├── auth/
│   │   ├── login/page.tsx           # Login page with Google button
│   │   └── callback/route.ts        # OAuth callback → sync Prisma User+Family; handles ?invite=CODE; seeds default categories
│   ├── dashboard/
│   │   ├── layout.tsx               # Dashboard shell: wraps children + BottomNav
│   │   ├── page.tsx                 # Balance overview + category breakdown + invite card
│   │   ├── expenses/page.tsx        # Variable expenses list + form (dynamic categories)
│   │   ├── fixed/page.tsx           # Fixed expenses list + paid/unpaid toggle (dynamic categories)
│   │   ├── income/page.tsx          # Income list + form
│   │   ├── savings/page.tsx         # Savings goal + deposit form + goal config
│   │   ├── budget/page.tsx          # Per-category budget limits + semaphore bars (dynamic categories)
│   │   └── settings/page.tsx        # Category management (add/delete custom categories)
│   └── invite/[code]/page.tsx       # Public invite page (join family)
├── components/
│   ├── auth/GoogleLoginButton.tsx
│   ├── expenses/
│   │   ├── ExpenseForm.tsx          # Accepts categories: CategoryRow[] prop
│   │   └── ExpenseList.tsx          # Per-row inline edit (✏️) + receipt viewer (📷)
│   ├── fixed/
│   │   ├── FixedExpenseForm.tsx     # Accepts categories: CategoryRow[] prop
│   │   └── FixedExpenseList.tsx     # Per-row useTransition; inline edit (✏️) + receipt viewer (📷)
│   ├── income/
│   │   ├── IncomeForm.tsx
│   │   └── IncomeList.tsx           # Per-row useTransition for delete
│   ├── savings/
│   │   ├── SavingsGoalCard.tsx      # Progress bar card (dark navy)
│   │   ├── SavingsGoalForm.tsx      # Set name + target amount
│   │   └── DepositForm.tsx          # Add funds to savings
│   ├── budget/
│   │   └── BudgetList.tsx           # All categories with inline edit + semaphore bar
│   ├── receipt/
│   │   └── ReceiptImageViewer.tsx   # Lightbox overlay for viewing receipt photos
│   ├── settings/
│   │   ├── CategoryList.tsx         # Category list with 🔒 for defaults, × for custom
│   │   └── CategoryForm.tsx         # Inline form to add new category (emoji + name)
│   ├── invite/
│   │   ├── InviteCard.tsx           # Copyable invite link card
│   │   ├── JoinWithGoogleButton.tsx # OAuth button with ?invite=CODE in redirectTo
│   │   └── JoinFamilyButton.tsx     # Server Action button for authenticated users
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx               # currentMonth optional; ⚙️ link to /dashboard/settings
│   │   └── MonthSelector.tsx
│   └── ui/
│       ├── Button.tsx               # primary/ghost/danger, sm/md/lg, loading state
│       ├── Card.tsx
│       └── Input.tsx                # labeled input with error state
├── generated/prisma/                # Auto-generated Prisma client (DO NOT EDIT)
├── lib/
│   ├── auth.ts                      # requireAuth() → { userId, familyId, userName }
│   ├── constants.ts                 # CATEGORY_COLORS (used for bar coloring); VARIABLE/FIXED_CATEGORIES kept as reference only
│   ├── db/
│   │   ├── expenses.ts              # Pure Prisma queries for variable expenses (+ updateExpense)
│   │   ├── fixed-expenses.ts        # Pure Prisma queries for fixed expenses (+ updateFixedExpense)
│   │   ├── income.ts                # Pure Prisma queries for income
│   │   ├── savings.ts               # getOrCreateSavingsGoal, updateSavingsGoalMeta, addToSaved
│   │   ├── budget.ts                # getBudgetsWithSpent (dynamic categories), upsertBudget, deleteBudget
│   │   ├── categories.ts            # getCategoriesByFamily, createCategory, deleteCategory, seedDefaultCategories
│   │   ├── family.ts                # getFamilyInviteInfo, getFamilyByInviteCode, joinFamily
│   │   └── dashboard.ts             # getDashboardData() — parallel queries, balance calc
│   ├── prisma.ts                    # PrismaClient singleton (with PrismaPg adapter)
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils.ts                     # formatMoney, getMonthKey, formatMonthLabel, cn, prevMonth, nextMonth
├── types/index.ts                   # Expense, FixedExpense, Income, SavingsGoal, Budget, CategoryRow + input types
middleware.ts                        # Protects /dashboard/*, redirects /auth/login if unauthenticated
```

## Data Model Key Points

- `User` belongs to one `Family`; all financial records belong to `Family`, not `User`
- `spentBy` / `earnedBy` are resolved to the user's display name at record creation
- `inviteCode` on `Family` is a UUID used to generate invite links for the partner
- `month` field indexes (`@@index([familyId, month])`) are present on all financial models — always include both in queries
- Dashboard balance = `totalIncome − totalVariableExpenses − totalFixedExpenses` (budget view: all fixed expenses count regardless of paid status)

## Auth Flow

1. Google OAuth via Supabase Auth
2. On first login: create `User` + `Family` records, store `familyId` in `user_metadata`
3. Partner joins via `/invite/[code]` → links their `User` to existing `Family`
4. `familyId` always sourced from `requireAuth()` server-side — never from client input

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL          # Supabase pooler (port 6543, ?pgbouncer=true) — runtime queries
DIRECT_URL            # Supabase direct (port 5432) — migrations only
NEXT_PUBLIC_APP_URL
```

## UI Conventions

- **Language**: code in English, UI text in Rioplatense Spanish
- **Mobile-first**: bottom navigation bar (6 tabs), large touch targets, numeric inputs for money
- **Color palette**: dark navy header (`#1a1a2e` / `#16213e`), light content area (`#f5f6fa`)
- **Money display**: monospace font; use `formatMoney()` from `src/lib/utils.ts`
- **Progress bars**: colored by category (CATEGORY_COLORS), width = % of total variable expenses
- Emojis used as iconography throughout the UI

## Expense Categories

**Variable**: Supermercado, Farmacia, Transporte, Comida afuera, Ropa, Bebé, Salud, Hogar, Ocio, Otro

**Fixed**: Alquiler, UTE (Luz), OSE (Agua), Internet, Celular, Seguro, Mutualista, Otro

Canonical category lists live in `src/lib/constants.ts`.
