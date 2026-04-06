# Nuestras Finanzas 💰

App de finanzas familiares para parejas. Mobile-first, uso diario, datos compartidos entre dos usuarios.

## Funcionalidades

### ✅ Disponibles ahora

| Módulo | Descripción |
|--------|-------------|
| 🏠 **Dashboard** | Balance del mes: ingresos − gastos variables − gastos fijos. Breakdown por categoría. |
| 💸 **Gastos variables** | Cargá gastos del día a día por categoría. Navegación por mes. |
| 📋 **Gastos fijos** | Alquiler, servicios, seguros. Toggle pagado/no pagado por ítem. |
| 💵 **Ingresos** | Registrá ingresos de cada miembro de la pareja. |
| 🎯 **Ahorro** | Meta de ahorro familiar con barra de progreso. Depositá montos y configurá el objetivo. |
| 📊 **Presupuesto** | Límites mensuales por categoría con semáforo verde/amarillo/rojo. |
| 🔗 **Invitar pareja** | Link de invitación para vincular al segundo usuario. Se accede desde el dashboard. |

### 🗺️ Roadmap

Ideas para próximas iteraciones, ordenadas por impacto:

| Prioridad | Feature | Descripción |
|-----------|---------|-------------|
| 🔥 Alta | **Editar gastos** | Modificar monto, categoría o fecha de un gasto ya registrado |
| 🔥 Alta | **PWA / instalable** | Manifest + service worker para instalar en el celular como app nativa |
| 🔥 Alta | **Deploy a Vercel** | App live con dominio propio y variables de entorno de producción |
| 🟡 Media | **Copiar fijos del mes anterior** | Auto-rellenar gastos fijos copiando los del mes previo |
| 🟡 Media | **Múltiples metas de ahorro** | Vacaciones, auto, fondo de emergencia, etc. |
| 🟡 Media | **Historial de depósitos** | Ver movimientos individuales de la meta de ahorro |
| 🟡 Media | **Gráficos de tendencia** | Evolución mensual de ingresos y gastos en un chart |
| 🟢 Baja | **Exportar a CSV** | Descargar el historial del mes en planilla |
| 🟢 Baja | **Notas en gastos** | Campo de descripción más visible y buscable |
| 🟢 Baja | **Dark mode** | Tema oscuro con toggle en el header |

## Stack

- **[Next.js 15](https://nextjs.org/)** — App Router, Server Components, Server Actions
- **[React 19](https://react.dev/)** + **[Tailwind CSS 4](https://tailwindcss.com/)** — UI mobile-first sin librerías de componentes
- **[Prisma 7](https://www.prisma.io/)** — ORM con driver adapter para PostgreSQL
- **[Supabase](https://supabase.com/)** — PostgreSQL managed + Auth (Google OAuth)
- **[TypeScript](https://www.typescriptlang.org/)** — tipado end-to-end
- **[Vercel](https://vercel.com/)** — deploy

## Arquitectura

```
Browser → Server Components / Server Actions → Prisma (adapter-pg) → PostgreSQL (Supabase)
                                                        ↑
                                            Supabase Auth (Google OAuth)
```

- Las páginas son **Server Components** que leen Prisma directamente (sin fetch, sin useEffect)
- Las mutaciones son **Server Actions** que validan auth y llaman la capa `lib/db/*`
- Los datos siempre están scoped a un `familyId` — nunca se exponen datos de otras familias
- El mes seleccionado viaja en la URL como `?month=YYYY-MM` — las URLs son compartibles

## Setup local

### Prerequisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com/) (gratuita)
- Proyecto en Google Cloud Console con OAuth 2.0 habilitado

### 1. Clonar e instalar

```bash
git clone https://github.com/ramiroquesada/SALDOS.git
cd SALDOS/PROYECTO\ SALDOS
npm install
```

### 2. Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Pooler (pgbouncer) para queries en runtime
DATABASE_URL=postgresql://postgres.<proyecto>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true

# Conexión directa para migraciones Prisma
DIRECT_URL=postgresql://postgres:<password>@db.<proyecto>.supabase.co:5432/postgres?sslmode=require

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Base de datos

```bash
# Crear las tablas en Supabase
npx prisma db push

# Regenerar el cliente Prisma
npx prisma generate
```

### 4. Google OAuth

En el [Supabase Dashboard](https://supabase.com/dashboard):
1. **Authentication → Providers → Google** → habilitar con Client ID y Secret de Google Cloud Console
2. **Authentication → URL Configuration → Redirect URLs** → agregar:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback*` (para soportar `?invite=CODE`)

En Google Cloud Console, agregar como **Authorized redirect URI**:
```
https://<proyecto>.supabase.co/auth/v1/callback
```

### 5. Correr

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

Para acceder desde el celular en la misma red:

```bash
npx next dev --hostname 0.0.0.0
```

## Comandos útiles

```bash
npm run dev                          # Dev server
npm run build && npm run start       # Build de producción
npm test                             # Tests (Vitest)

npx prisma studio                    # Explorar la base de datos visualmente
npx prisma db push                   # Sincronizar schema con la DB (sin migraciones)
npx prisma generate                  # Regenerar cliente después de cambios en el schema
```

## Estructura del proyecto

```
src/
├── actions/          # Server Actions (mutaciones)
│   ├── expenses.ts, fixed-expenses.ts, income.ts
│   ├── savings.ts, budget.ts, family.ts
├── app/              # Rutas Next.js (App Router)
│   ├── auth/         # Login + OAuth callback (soporta ?invite=CODE)
│   ├── dashboard/    # Todas las páginas autenticadas
│   └── invite/[code] # Página pública de invitación
├── components/
│   ├── ui/           # Button, Input, Card
│   ├── layout/       # Header, BottomNav, MonthSelector
│   ├── expenses/, fixed/, income/
│   ├── savings/      # SavingsGoalCard, SavingsGoalForm, DepositForm
│   ├── budget/       # BudgetList con inline editing y semáforo
│   └── invite/       # InviteCard, JoinWithGoogleButton, JoinFamilyButton
├── lib/
│   ├── db/           # Queries Prisma puras (expenses, fixed, income, savings, budget, family, dashboard)
│   ├── supabase/     # Clientes Supabase (server + browser)
│   ├── auth.ts       # requireAuth() → { userId, familyId, userName }
│   ├── constants.ts  # Categorías y colores
│   └── utils.ts      # formatMoney, getMonthKey, etc.
└── types/            # Tipos TypeScript compartidos
```

## Modelo de datos

```prisma
User         → pertenece a una Family
Family       → tiene Expenses, FixedExpenses, Incomes, SavingsGoals, Budgets
               inviteCode: UUID para el link de invitación
Expense      → gasto variable (amount, category, spentBy, month)
FixedExpense → gasto fijo mensual (amount, category, paid, month)
Income       → ingreso (amount, earnedBy, month)
SavingsGoal  → meta de ahorro de la familia (name, target, saved)
Budget       → límite mensual por categoría (category, limit, month)
```

Todos los registros financieros pertenecen a la `Family`, no al `User` individualmente.

## Deploy

El proyecto está configurado para deploy en [Vercel](https://vercel.com/). Conectar el repositorio y agregar las variables de entorno en el dashboard de Vercel (las mismas que `.env.local`, con `NEXT_PUBLIC_APP_URL` apuntando al dominio de producción).

---

Hecho con Next.js, Supabase y mucho ☕
