import { requireAuth } from '@/lib/auth'
import { getDashboardData } from '@/lib/db/dashboard'
import { getMonthKey, formatMoney, formatMonthLabel } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { CATEGORY_COLORS } from '@/lib/constants'
import { getFamilyInviteInfo } from '@/lib/db/family'
import { InviteCard } from '@/components/invite/InviteCard'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const [{ totalIncome, totalVariableExpenses, totalFixedExpenses, balance, expensesByCategory }, familyInfo] =
    await Promise.all([
      getDashboardData(familyId, currentMonth),
      getFamilyInviteInfo(familyId),
    ])

  const totalExpenses = totalVariableExpenses + totalFixedExpenses
  const balancePositive = balance > 0

  return (
    <>
      <Header title="Nuestras Finanzas" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        {/* Balance principal */}
        <div className="rounded-2xl bg-[#1a1a2e] p-5 text-white">
          <p className="text-xs text-white/60">Balance de {formatMonthLabel(currentMonth)}</p>
          <p className={`font-mono text-3xl font-bold ${balancePositive ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-white/80'}`}>
            {balancePositive ? '+' : ''}{formatMoney(balance)}
          </p>
        </div>

        {/* Fila ingresos / gastos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">Ingresos</p>
            <p className="font-mono text-lg font-bold text-green-600">{formatMoney(totalIncome)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">Gastos</p>
            <p className="font-mono text-lg font-bold text-red-500">{formatMoney(totalExpenses)}</p>
          </div>
        </div>

        {/* Detalle de gastos */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-xs text-gray-400 mb-3">
            <span>Variables</span>
            <span className="font-mono font-semibold text-gray-700">{formatMoney(totalVariableExpenses)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Fijos</span>
            <span className="font-mono font-semibold text-gray-700">{formatMoney(totalFixedExpenses)}</span>
          </div>
        </div>

        {/* Breakdown por categoría */}
        {expensesByCategory.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Por categoría</h2>
            <div className="space-y-3">
              {expensesByCategory.map(({ category, total }) => {
                const pct = totalVariableExpenses > 0
                  ? Math.round((total / totalVariableExpenses) * 100)
                  : 0
                const color = CATEGORY_COLORS[category] ?? '#607D8B'
                return (
                  <div key={category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{category}</span>
                      <span className="font-mono font-semibold text-gray-800">{formatMoney(total)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {expensesByCategory.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-2xl">🌟</p>
            <p className="mt-2 text-sm text-gray-500">
              {totalIncome === 0
                ? 'Registrá ingresos y gastos para ver el balance.'
                : 'Sin gastos variables este mes.'}
            </p>
          </div>
        )}

        {/* Invitar pareja */}
        {familyInfo && (
          <InviteCard
            inviteCode={familyInfo.inviteCode}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
            memberCount={familyInfo.members.length}
          />
        )}
      </main>
    </>
  )
}
