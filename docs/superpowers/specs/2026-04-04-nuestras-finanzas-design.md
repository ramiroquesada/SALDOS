# Nuestras Finanzas — Design Document

**Fecha:** 2026-04-04  
**Estado:** Aprobado

---

## Resumen

App web de finanzas familiares para parejas. Mobile-first, uso diario, datos compartidos entre dos usuarios. Stack: Next.js 14 App Router + React 19 + Tailwind CSS 4 + Prisma + Supabase (Auth + PostgreSQL) + TypeScript. Deploy en Vercel.

---

## Fases de desarrollo

| Fase | Módulos | Resultado |
|------|---------|-----------|
| 1 | Scaffolding + Auth + Gastos Variables | App funcional: login con Google, cargar gastos, verlos |
| 2 | Gastos Fijos + Ingresos + Dashboard | Vista completa del mes con balance real |
| 3 | Ahorro + Presupuesto + Invitar pareja | App completa |

---

## Arquitectura general

```
Browser (React) → Server Components / Server Actions → Prisma → PostgreSQL (Supabase)
                                                          ↑
                                              Supabase Auth (Google OAuth)
```

- **Monorepo:** un solo proyecto Next.js en `SALDOS/PROYECTO SALDOS/`
- **Server Components** para todas las páginas de lectura (dashboard, listas)
- **Server Actions** para todas las mutaciones (crear, editar, eliminar)
- **Sin API Route Handlers** en las primeras fases — la lógica vive en `actions/` y `lib/db/`
- **Future API layer:** los futuros Route Handlers llamarán las mismas funciones de `lib/db/*`, sin duplicar lógica

---

## Sección 1: Auth Flow

### El problema
Supabase Auth maneja usuarios de autenticación. Prisma maneja usuarios de la app. Hay que sincronizarlos.

### Solución: sincronización lazy en el callback de OAuth

```
Google OAuth
    → Supabase Auth (crea auth.user con UUID)
    → /auth/callback/route.ts
        → exchangeCodeForSession()
        → upsert User en Prisma (User.id = auth.user.id)
        → si no tiene Family → crear Family + asignar
        → redirect a /dashboard
```

**Decisiones clave:**
- `User.id` en Prisma es el mismo UUID que `auth.user.id` en Supabase — no hay tabla de mapeo
- El `familyId` se guarda en `user_metadata` de Supabase para evitar un DB query en cada request. Se actualiza también cuando el usuario se une a una familia via invite code.
- Middleware de Next.js protege todas las rutas `/dashboard/*` — sin sesión → redirect a `/auth/login`
- `src/lib/supabase/server.ts` usa `@supabase/ssr` para leer sesión en Server Components y Server Actions

---

## Sección 2: Capa de datos y Server Actions

### Estructura

```
src/
├── lib/
│   ├── db/                        # Funciones puras de Prisma (sin contexto de request)
│   │   ├── expenses.ts
│   │   ├── fixed-expenses.ts
│   │   ├── income.ts
│   │   ├── savings.ts
│   │   ├── budget.ts
│   │   └── family.ts
│   ├── prisma.ts                  # Singleton del cliente Prisma
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   └── server.ts              # Server client (SSR)
│   ├── auth.ts                    # requireAuth() → { userId, familyId } o redirect
│   ├── constants.ts               # Categorías, colores, meses
│   └── utils.ts                   # formatMoney(), getMonthKey()
├── actions/                       # Server Actions: validan auth + llaman lib/db/*
│   ├── expenses.ts
│   ├── fixed-expenses.ts
│   ├── income.ts
│   ├── savings.ts
│   ├── budget.ts
│   └── family.ts
```

### Patrón de una Server Action

```ts
// actions/expenses.ts
'use server'
export async function createExpense(data: CreateExpenseInput) {
  const { familyId } = await requireAuth() // lanza redirect si no autenticado
  return db.expenses.create({ ...data, familyId })
}
```

### Regla de scoping
Toda query a Prisma incluye `where: { familyId }`. Nunca se exponen datos de otras familias.

---

## Sección 3: Routing y páginas

### Estructura de rutas

```
app/
├── page.tsx                      # Redirect: auth → /dashboard, no auth → /auth/login
├── auth/
│   ├── login/page.tsx            # Botón "Continuar con Google"
│   └── callback/route.ts         # OAuth handler → sync Prisma → redirect
├── dashboard/
│   ├── layout.tsx                # Shell: Header + BottomNav
│   ├── page.tsx                  # Dashboard principal
│   ├── expenses/page.tsx
│   ├── fixed/page.tsx
│   ├── income/page.tsx
│   ├── savings/page.tsx
│   └── budget/page.tsx
└── invite/[code]/page.tsx        # Página pública: unirse a una familia
```

### Patrón de página

```
Page (Server Component)
├── Lee datos via lib/db/* directamente (sin fetch, sin useEffect)
├── Pasa datos como props a Client Components
└── Client Components manejan:
    ├── Formularios (useState para inputs)
    ├── Llamadas a Server Actions
    └── Feedback visual (loading, error)
```

### Selector de mes
El mes viaja como `searchParam` en la URL (`?month=2026-04`), no en estado global. Los Server Components lo leen directamente. Esto hace las URLs compartibles.

---

## Sección 4: UI y diseño visual

### Componentes

```
src/components/
├── ui/                    # Primitivos sin lógica de negocio
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── ProgressBar.tsx    # Colores semafóricos automáticos por porcentaje
│   └── Badge.tsx
├── layout/
│   ├── Header.tsx         # Título + MonthSelector
│   └── BottomNav.tsx      # 6 tabs fijos en el bottom
└── [módulo]/              # Componentes específicos por sección
```

### Convenciones visuales

| Elemento | Especificación |
|----------|---------------|
| Header | `#1a1a2e` / `#16213e` dark navy |
| Fondo | `#f5f6fa` claro |
| Cards | Blancas, sombra suave |
| Montos | `formatMoney()` → `$ 1.234`, fuente monospace |
| ProgressBar | Verde 0–79%, amarillo 80–99%, rojo 100%+ |
| BottomNav | Emoji + label, `64px` fijo |
| Inputs numéricos | `inputMode="decimal"` |
| Touch targets | Mínimo `44px` de alto |

**Sin librerías de componentes** (no shadcn, no MUI) — Tailwind CSS 4 puro.

---

## Modelo de datos

Ver `nuestras-finanzas-spec.md` para el schema Prisma completo. Puntos clave:

- `User.id` = UUID de Supabase Auth
- Todos los registros financieros pertenecen a `Family`, no a `User`
- `month` es un string `"YYYY-MM"` — todas las queries filtran por `{ familyId, month }`
- `spentBy` / `earnedBy` se resuelven al nombre del usuario en el momento de creación
- `inviteCode` en `Family` es el UUID para el link de invitación

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
NEXT_PUBLIC_APP_URL
```
