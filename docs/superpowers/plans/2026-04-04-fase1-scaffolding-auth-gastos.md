# Fase 1: Scaffolding + Auth + Gastos Variables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App funcional con login Google (Supabase OAuth), creación de usuario/familia automática, y CRUD de gastos variables filtrados por mes.

**Architecture:** Server Components para lectura directa de Prisma, Server Actions para mutaciones. El `User.id` en Prisma es el mismo UUID de Supabase Auth. `familyId` viaja en `user_metadata` de Supabase para evitar DB queries en cada request. El mes seleccionado viaja como `?month=YYYY-MM` en la URL.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, Prisma 6, PostgreSQL (Supabase), Supabase Auth + SSR, TypeScript, Vitest (tests de utilidades)

---

## Mapa de archivos

**Nuevos (todos):**

| Archivo | Responsabilidad |
|---------|----------------|
| `middleware.ts` | Protege `/dashboard/*`, redirige a login si sin sesión |
| `prisma/schema.prisma` | Schema completo del modelo de datos |
| `src/types/index.ts` | Tipos TypeScript compartidos |
| `src/lib/constants.ts` | Categorías, colores |
| `src/lib/utils.ts` | `formatMoney`, `getMonthKey`, `formatMonthLabel`, `cn` |
| `src/lib/prisma.ts` | Singleton de PrismaClient |
| `src/lib/supabase/client.ts` | Supabase browser client |
| `src/lib/supabase/server.ts` | Supabase server client (SSR) |
| `src/lib/auth.ts` | `requireAuth()` → `{ userId, familyId }` o redirect |
| `src/lib/db/expenses.ts` | Queries Prisma para gastos (sin contexto de request) |
| `src/actions/expenses.ts` | Server Actions: validan auth, llaman `lib/db/expenses` |
| `src/app/layout.tsx` | Root layout |
| `src/app/page.tsx` | Redirect según sesión |
| `src/app/globals.css` | Estilos globales + fuentes |
| `src/app/auth/login/page.tsx` | Página de login con Google |
| `src/app/auth/callback/route.ts` | OAuth handler: sync Prisma, crea User+Family |
| `src/app/dashboard/layout.tsx` | Shell autenticado: Header + BottomNav |
| `src/app/dashboard/page.tsx` | Dashboard placeholder (Fase 2) |
| `src/app/dashboard/expenses/page.tsx` | Lista + formulario de gastos |
| `src/components/ui/Button.tsx` | Primitivo Button |
| `src/components/ui/Input.tsx` | Primitivo Input |
| `src/components/ui/Card.tsx` | Primitivo Card |
| `src/components/layout/Header.tsx` | Header con título y MonthSelector |
| `src/components/layout/BottomNav.tsx` | Navegación inferior mobile |
| `src/components/layout/MonthSelector.tsx` | Selector de mes (modifica searchParam) |
| `src/components/auth/GoogleLoginButton.tsx` | Botón OAuth Google |
| `src/components/expenses/ExpenseForm.tsx` | Formulario de nuevo gasto |
| `src/components/expenses/ExpenseList.tsx` | Lista cronológica de gastos |
| `src/__tests__/utils.test.ts` | Tests de `formatMoney`, `getMonthKey` |

---

## Task 1: Scaffold del proyecto Next.js

**Files:**
- Create: `PROYECTO SALDOS/` (directorio raíz del proyecto)

- [ ] **Step 1: Crear el proyecto desde `SALDOS/`**

Ejecutar desde `Desktop/SALDOS/`:
```bash
npx create-next-app@latest "PROYECTO SALDOS" --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
```

Cuando pregunte:
- Would you like to use Turbopack? → **Yes**

- [ ] **Step 2: Instalar dependencias**

```bash
cd "PROYECTO SALDOS"
npm install @prisma/client @supabase/supabase-js @supabase/ssr clsx
npm install -D prisma vitest @vitest/ui
```

- [ ] **Step 3: Inicializar Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Esto crea `prisma/schema.prisma` y agrega `DATABASE_URL` a `.env`.

- [ ] **Step 4: Inicializar git**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project"
```

---

## Task 2: Prisma schema y migración inicial

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Reemplazar el contenido de `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id
  email     String   @unique
  name      String?
  avatarUrl String?
  familyId  String?
  family    Family?  @relation(fields: [familyId], references: [id])
  createdAt DateTime @default(now())
}

model Family {
  id            String         @id @default(uuid())
  name          String         @default("Mi familia")
  inviteCode    String         @unique @default(uuid())
  members       User[]
  expenses      Expense[]
  fixedExpenses FixedExpense[]
  incomes       Income[]
  savingsGoals  SavingsGoal[]
  budgets       Budget[]
  createdAt     DateTime       @default(now())
}

model Expense {
  id          String   @id @default(uuid())
  amount      Float
  description String?
  category    String
  spentBy     String
  date        DateTime @default(now())
  month       String
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id])
  userId      String
  createdAt   DateTime @default(now())

  @@index([familyId, month])
}

model FixedExpense {
  id       String  @id @default(uuid())
  amount   Float
  category String
  paid     Boolean @default(false)
  month    String
  familyId String
  family   Family  @relation(fields: [familyId], references: [id])

  @@index([familyId, month])
}

model Income {
  id          String   @id @default(uuid())
  amount      Float
  description String?
  earnedBy    String
  date        DateTime @default(now())
  month       String
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id])
  userId      String
  createdAt   DateTime @default(now())

  @@index([familyId, month])
}

model SavingsGoal {
  id       String @id @default(uuid())
  name     String @default("Bebé")
  target   Float  @default(0)
  saved    Float  @default(0)
  familyId String
  family   Family @relation(fields: [familyId], references: [id])
}

model Budget {
  id       String @id @default(uuid())
  category String
  limit    Float
  month    String
  familyId String
  family   Family @relation(fields: [familyId], references: [id])

  @@unique([familyId, category, month])
}
```

Nota: Se usa `directUrl` para Supabase con connection pooling. Ambas variables se configuran en Task 3.

- [ ] **Step 2: Crear `.env.local` con las variables (sin valores reales todavía)**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
DATABASE_URL=postgresql://postgres.TU_REF:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.TU_REF:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 3: Agregar `.env.local` al `.gitignore`**

Verificar que `.gitignore` ya contenga `.env.local` (create-next-app lo incluye por defecto). Si no está:
```bash
echo ".env.local" >> .gitignore
```

También asegurarse que `.env` (creado por prisma init) esté en `.gitignore`:
```bash
echo ".env" >> .gitignore
```

- [ ] **Step 4: Correr la migración** *(requiere `DATABASE_URL` real en `.env.local`)*

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Salida esperada: `✓ Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
git add prisma/ .gitignore
git commit -m "feat: add Prisma schema with all models"
```

---

## Task 3: Supabase clients

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Crear browser client**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Crear server client**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // En Server Components el set es ignorado (esperado)
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase client and server clients"
```

---

## Task 4: Tipos, constantes y utilidades

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/utils.ts`
- Create: `src/__tests__/utils.test.ts`
- Modify: `package.json` (agregar script de test)

- [ ] **Step 1: Agregar script de test en `package.json`**

En la sección `"scripts"` de `package.json`, agregar:
```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Escribir los tests**

```ts
// src/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatMoney, getMonthKey, formatMonthLabel } from '@/lib/utils'

describe('formatMoney', () => {
  it('formatea números enteros con símbolo $', () => {
    expect(formatMoney(1000)).toBe('$ 1.000')
  })

  it('formatea cero correctamente', () => {
    expect(formatMoney(0)).toBe('$ 0')
  })

  it('formatea números grandes', () => {
    expect(formatMoney(50000)).toBe('$ 50.000')
  })
})

describe('getMonthKey', () => {
  it('retorna formato YYYY-MM', () => {
    const result = getMonthKey(new Date('2026-04-15'))
    expect(result).toBe('2026-04')
  })

  it('usa la fecha actual cuando no se pasa argumento', () => {
    const result = getMonthKey()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })

  it('maneja correctamente meses con un dígito', () => {
    expect(getMonthKey(new Date('2026-01-01'))).toBe('2026-01')
  })
})

describe('formatMonthLabel', () => {
  it('retorna el nombre del mes en español', () => {
    const result = formatMonthLabel('2026-04')
    expect(result).toContain('abril')
    expect(result).toContain('2026')
  })
})
```

- [ ] **Step 4: Correr tests — deben fallar**

```bash
npm test
```

Salida esperada: `FAIL src/__tests__/utils.test.ts — Cannot find module '@/lib/utils'`

- [ ] **Step 5: Crear `src/types/index.ts`**

```ts
// src/types/index.ts
export type Expense = {
  id: string
  amount: number
  description: string | null
  category: string
  spentBy: string
  date: Date
  month: string
  familyId: string
  userId: string
  createdAt: Date
}

export type CreateExpenseInput = {
  amount: number
  description?: string
  category: string
  date?: string // ISO string desde el formulario
  // spentBy viene de requireAuth().userName, no del formulario
}
```

- [ ] **Step 6: Crear `src/lib/constants.ts`**

```ts
// src/lib/constants.ts
export const VARIABLE_CATEGORIES = [
  'Supermercado',
  'Farmacia',
  'Transporte',
  'Comida afuera',
  'Ropa',
  'Bebé',
  'Salud',
  'Hogar',
  'Ocio',
  'Otro',
] as const

export type VariableCategory = (typeof VARIABLE_CATEGORIES)[number]

export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: '#4CAF50',
  Farmacia: '#2196F3',
  Transporte: '#FF9800',
  'Comida afuera': '#F44336',
  Ropa: '#9C27B0',
  'Bebé': '#E91E63',
  Salud: '#00BCD4',
  Hogar: '#795548',
  Ocio: '#FF5722',
  Otro: '#607D8B',
}

export const FIXED_CATEGORIES = [
  'Alquiler',
  'UTE (Luz)',
  'OSE (Agua)',
  'Internet',
  'Celular',
  'Seguro',
  'Mutualista',
  'Otro',
] as const
```

- [ ] **Step 7: Crear `src/lib/utils.ts`**

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatMoney(amount: number): string {
  return `$ ${amount.toLocaleString('es-UY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('es-UY', { month: 'long', year: 'numeric' })
}

export function prevMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return getMonthKey(date)
}

export function nextMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month, 1)
  return getMonthKey(date)
}
```

- [ ] **Step 8: Correr tests — deben pasar**

```bash
npm test
```

Salida esperada:
```
✓ src/__tests__/utils.test.ts (7 tests)
Test Files  1 passed
```

- [ ] **Step 9: Commit**

```bash
git add src/types/ src/lib/constants.ts src/lib/utils.ts src/__tests__/ vitest.config.ts package.json
git commit -m "feat: add types, constants, utils with tests"
```

---

## Task 5: Prisma singleton, auth helper y middleware

**Files:**
- Create: `src/lib/prisma.ts`
- Create: `src/lib/auth.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Crear Prisma singleton**

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Crear `requireAuth`**

```ts
// src/lib/auth.ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AuthContext = {
  userId: string
  familyId: string
  userName: string
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const familyId = user.user_metadata?.familyId as string | undefined
  if (!familyId) redirect('/auth/login')

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Vos'

  return { userId: user.id, familyId, userName }
}
```

- [ ] **Step 3: Crear middleware de protección de rutas**

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isLogin = request.nextUrl.pathname === '/auth/login'

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isLogin && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/login'],
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/prisma.ts src/lib/auth.ts middleware.ts
git commit -m "feat: add Prisma singleton, requireAuth, and middleware"
```

---

## Task 6: Páginas de Auth (login + callback)

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/components/auth/GoogleLoginButton.tsx`

- [ ] **Step 1: Crear página raíz con redirect**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')
  else redirect('/auth/login')
}
```

- [ ] **Step 2: Crear componente GoogleLoginButton**

```tsx
// src/components/auth/GoogleLoginButton.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export function GoogleLoginButton() {
  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-gray-800 shadow-md transition-transform active:scale-95"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Continuar con Google
    </button>
  )
}
```

- [ ] **Step 3: Crear página de login**

```tsx
// src/app/auth/login/page.tsx
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a2e] px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Título */}
        <div className="text-center">
          <div className="text-5xl">💰</div>
          <h1 className="mt-4 text-2xl font-bold text-white">
            Nuestras Finanzas
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Control de finanzas para parejas
          </p>
        </div>

        {/* Card de login */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <p className="mb-4 text-center text-sm text-gray-500">
            Iniciá sesión para continuar
          </p>
          <GoogleLoginButton />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Crear callback de OAuth con sync de Prisma**

```ts
// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // Sincronizar usuario con Prisma
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  if (!existingUser) {
    // Primera vez: crear familia + usuario
    const family = await prisma.family.create({ data: {} })

    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: (user.user_metadata.full_name as string) ?? null,
        avatarUrl: (user.user_metadata.avatar_url as string) ?? null,
        familyId: family.id,
      },
    })

    // Guardar familyId en user_metadata para evitar DB query en cada request
    await supabase.auth.updateUser({
      data: { familyId: family.id },
    })
  } else if (!user.user_metadata?.familyId && existingUser.familyId) {
    // El familyId existe en Prisma pero no en metadata (edge case)
    await supabase.auth.updateUser({
      data: { familyId: existingUser.familyId },
    })
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

- [ ] **Step 5: Verificar manualmente**

Con Supabase configurado:
1. `npm run dev`
2. Abrir `http://localhost:3000` → debe redirigir a `/auth/login`
3. Hacer click en "Continuar con Google"
4. Completar OAuth
5. Debe redirigir a `/dashboard` (aunque sea página vacía)
6. En Supabase Dashboard → Table Editor → User: verificar que se creó el registro
7. En Supabase Dashboard → Table Editor → Family: verificar que se creó la familia

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/auth/ src/components/auth/
git commit -m "feat: add Google OAuth flow with Prisma user/family sync"
```

---

## Task 7: Componentes UI primitivos

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Card.tsx`

- [ ] **Step 1: Crear Button**

```tsx
// src/components/ui/Button.tsx
import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'h-9 px-4 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-14 w-full text-base',
        variant === 'primary' && 'bg-[#1a1a2e] text-white',
        variant === 'ghost' && 'bg-gray-100 text-[#1a1a2e]',
        variant === 'danger' && 'bg-red-500 text-white',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}
```

- [ ] **Step 2: Crear Input**

```tsx
// src/components/ui/Input.tsx
import { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900',
          'focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]',
          'placeholder:text-gray-400',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Crear Card**

```tsx
// src/components/ui/Card.tsx
import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-4 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add Button, Input, Card UI primitives"
```

---

## Task 8: Componentes de layout

**Files:**
- Create: `src/components/layout/MonthSelector.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Crear MonthSelector**

```tsx
// src/components/layout/MonthSelector.tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatMonthLabel, prevMonth, nextMonth } from '@/lib/utils'

type MonthSelectorProps = {
  currentMonth: string
}

export function MonthSelector({ currentMonth }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', month)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(prevMonth(currentMonth))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 active:bg-white/20"
      >
        ‹
      </button>
      <span className="text-sm font-semibold capitalize text-white">
        {formatMonthLabel(currentMonth)}
      </span>
      <button
        onClick={() => navigate(nextMonth(currentMonth))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 active:bg-white/20"
      >
        ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Crear Header**

```tsx
// src/components/layout/Header.tsx
import { Suspense } from 'react'
import { MonthSelector } from './MonthSelector'

type HeaderProps = {
  title: string
  currentMonth: string
}

export function Header({ title, currentMonth }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#1a1a2e] px-4 py-3 shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-white">{title}</h1>
        <Suspense fallback={<div className="h-8 w-32 rounded animate-pulse bg-white/10" />}>
          <MonthSelector currentMonth={currentMonth} />
        </Suspense>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Crear BottomNav**

```tsx
// src/components/layout/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', emoji: '🏠' },
  { href: '/dashboard/expenses', label: 'Gastos', emoji: '💸' },
  { href: '/dashboard/fixed', label: 'Fijos', emoji: '📋' },
  { href: '/dashboard/income', label: 'Ingresos', emoji: '💵' },
  { href: '/dashboard/savings', label: 'Ahorro', emoji: '🎯' },
  { href: '/dashboard/budget', label: 'Presup.', emoji: '📊' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around border-t border-gray-100 bg-white shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1',
              isActive ? 'text-[#1a1a2e]' : 'text-gray-400'
            )}
          >
            <span className="text-xl leading-none">{item.emoji}</span>
            <span className={cn('text-[10px]', isActive && 'font-semibold')}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "feat: add Header, BottomNav, MonthSelector layout components"
```

---

## Task 9: Dashboard layout y páginas shell

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Actualizar root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Nuestras Finanzas',
  description: 'Control de finanzas para parejas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Actualizar `globals.css`**

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --font-geist: 'Geist', sans-serif;
  --font-geist-mono: 'Geist Mono', monospace;
}

body {
  background-color: #f5f6fa;
  font-family: var(--font-geist);
}

.font-mono {
  font-family: var(--font-geist-mono);
}
```

- [ ] **Step 3: Crear dashboard layout**

```tsx
// src/app/dashboard/layout.tsx
import { BottomNav } from '@/components/layout/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Crear dashboard página placeholder**

```tsx
// src/app/dashboard/page.tsx
import { requireAuth } from '@/lib/auth'
import { getMonthKey } from '@/lib/utils'
import { Header } from '@/components/layout/Header'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  return (
    <>
      <Header title="Nuestras Finanzas" currentMonth={currentMonth} />
      <main className="px-4 py-6">
        <p className="text-center text-sm text-gray-400">
          Dashboard — próximamente en Fase 2 🚧
        </p>
      </main>
    </>
  )
}
```

- [ ] **Step 5: Verificar manualmente**

```bash
npm run dev
```

1. Ir a `http://localhost:3000/dashboard`
2. Debe mostrar Header con selector de mes y BottomNav con 6 tabs
3. Los tabs de navegación deben funcionar (aunque las páginas estén vacías)

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/dashboard/
git commit -m "feat: add dashboard layout with Header and BottomNav"
```

---

## Task 10: Capa de datos de gastos

**Files:**
- Create: `src/lib/db/expenses.ts`

- [ ] **Step 1: Crear `src/lib/db/expenses.ts`**

```ts
// src/lib/db/expenses.ts
import { prisma } from '@/lib/prisma'
import { getMonthKey } from '@/lib/utils'
import type { CreateExpenseInput } from '@/types'

export async function getExpensesByMonth(familyId: string, month: string) {
  return prisma.expense.findMany({
    where: { familyId, month },
    orderBy: { date: 'desc' },
  })
}

export async function createExpense(
  familyId: string,
  userId: string,
  spentBy: string,
  data: CreateExpenseInput
) {
  const date = data.date ? new Date(data.date) : new Date()
  return prisma.expense.create({
    data: {
      amount: data.amount,
      description: data.description ?? null,
      category: data.category,
      spentBy,
      date,
      month: getMonthKey(date),
      familyId,
      userId,
    },
  })
}

export async function deleteExpense(id: string, familyId: string) {
  // El familyId en la condición evita eliminar gastos de otras familias
  return prisma.expense.delete({
    where: { id, familyId },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add expenses DB layer"
```

---

## Task 11: Server Actions de gastos

**Files:**
- Create: `src/actions/expenses.ts`

- [ ] **Step 1: Crear `src/actions/expenses.ts`**

```ts
// src/actions/expenses.ts
'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/expenses'
import { revalidatePath } from 'next/cache'
import type { CreateExpenseInput } from '@/types'

export async function createExpense(data: CreateExpenseInput) {
  const { userId, familyId, userName } = await requireAuth()
  await db.createExpense(familyId, userId, userName, data)
  revalidatePath('/dashboard/expenses')
}

export async function deleteExpense(id: string) {
  const { familyId } = await requireAuth()
  await db.deleteExpense(id, familyId)
  revalidatePath('/dashboard/expenses')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/
git commit -m "feat: add expenses Server Actions"
```

---

## Task 12: Componentes de gastos

**Files:**
- Create: `src/components/expenses/ExpenseForm.tsx`
- Create: `src/components/expenses/ExpenseList.tsx`

- [ ] **Step 1: Crear ExpenseForm**

```tsx
// src/components/expenses/ExpenseForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { VARIABLE_CATEGORIES } from '@/lib/constants'
import { createExpense } from '@/actions/expenses'

export function ExpenseForm() {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(VARIABLE_CATEGORIES[0])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) return

    startTransition(async () => {
      await createExpense({
        amount: parsed,
        description: description.trim() || undefined,
        category,
      })
      setAmount('')
      setDescription('')
      setCategory(VARIABLE_CATEGORIES[0])
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">Nuevo gasto</h2>

      <Input
        id="amount"
        label="Monto"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <Input
        id="description"
        label="Descripción (opcional)"
        type="text"
        placeholder="¿En qué gastaste?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Categoría
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
        >
          {VARIABLE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" loading={isPending}>
        Agregar gasto
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Crear ExpenseList**

```tsx
// src/components/expenses/ExpenseList.tsx
'use client'

import { useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/constants'
import { deleteExpense } from '@/actions/expenses'
import type { Expense } from '@/types'

type ExpenseListProps = {
  expenses: Expense[]
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  const [isPending, startTransition] = useTransition()

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-2xl">🌟</p>
        <p className="mt-2 text-sm text-gray-500">
          No hay gastos este mes todavía.
        </p>
      </div>
    )
  }

  function handleDelete(id: string) {
    startTransition(() => deleteExpense(id))
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          {/* Color dot de categoría */}
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[expense.category] ?? '#607D8B' }}
          />

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {expense.description ?? expense.category}
            </p>
            <p className="text-xs text-gray-400">
              {expense.category} · {expense.spentBy}
            </p>
          </div>

          {/* Monto */}
          <span className="font-mono text-sm font-semibold text-gray-900">
            {formatMoney(expense.amount)}
          </span>

          {/* Eliminar */}
          <button
            onClick={() => handleDelete(expense.id)}
            disabled={isPending}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 active:scale-90 disabled:opacity-50"
            aria-label="Eliminar gasto"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/expenses/
git commit -m "feat: add ExpenseForm and ExpenseList components"
```

---

## Task 13: Página de gastos variables

**Files:**
- Create: `src/app/dashboard/expenses/page.tsx`

- [ ] **Step 1: Crear la página**

```tsx
// src/app/dashboard/expenses/page.tsx
import { requireAuth } from '@/lib/auth'
import { getExpensesByMonth } from '@/lib/db/expenses'
import { getMonthKey, formatMoney } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { ExpenseList } from '@/components/expenses/ExpenseList'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function ExpensesPage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const expenses = await getExpensesByMonth(familyId, currentMonth)
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <>
      <Header title="Gastos variables" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        {/* Total del mes */}
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
          <p className="text-xs text-white/60">Total del mes</p>
          <p className="font-mono text-2xl font-bold">{formatMoney(total)}</p>
          <p className="text-xs text-white/40">{expenses.length} gastos registrados</p>
        </div>

        {/* Formulario */}
        <ExpenseForm />

        {/* Lista */}
        <ExpenseList expenses={expenses} />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Verificar manualmente la Fase 1 completa**

Con Supabase configurado y migración ejecutada:

1. `npm run dev`
2. Ir a `http://localhost:3000` → redirige a `/auth/login`
3. Login con Google → redirige a `/dashboard`
4. Ir a `/dashboard/expenses`
5. Agregar un gasto → debe aparecer en la lista
6. Eliminar un gasto → debe desaparecer
7. Cambiar de mes con los botones `‹` `›` → la URL cambia y la lista se actualiza
8. Abrir en el celular (con `npx next dev --hostname 0.0.0.0`) y verificar que funcione en mobile

- [ ] **Step 3: Commit final de Fase 1**

```bash
git add src/app/dashboard/expenses/
git commit -m "feat: complete Phase 1 - expenses page with list and form"
```

---

## Resumen de Fase 1

Al terminar esta fase la app tiene:
- ✅ Login con Google via Supabase OAuth
- ✅ Creación automática de usuario + familia en primer login
- ✅ Rutas protegidas por middleware
- ✅ Selector de mes en la URL (`?month=YYYY-MM`)
- ✅ CRUD de gastos variables (crear + eliminar)
- ✅ Total del mes calculado en el servidor
- ✅ Navegación inferior con 6 tabs
- ✅ Tests de utilidades pasando

**Siguiente:** Fase 2 — Gastos Fijos + Ingresos + Dashboard con balance real.
