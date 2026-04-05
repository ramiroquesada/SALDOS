import { requireAuth } from '@/lib/auth'
import { getFixedExpensesByMonth } from '@/lib/db/fixed-expenses'
import { getMonthKey, formatMoney } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { FixedExpenseForm } from '@/components/fixed/FixedExpenseForm'
import { FixedExpenseList } from '@/components/fixed/FixedExpenseList'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function FixedExpensesPage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const fixedExpenses = await getFixedExpensesByMonth(familyId, currentMonth)
  const totalPaid = fixedExpenses.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0)
  const totalPending = fixedExpenses.filter((e) => !e.paid).reduce((sum, e) => sum + e.amount, 0)

  return (
    <>
      <Header title="Gastos fijos" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        {/* Resumen */}
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-white/60">Pagado</p>
              <p className="font-mono text-xl font-bold text-green-400">{formatMoney(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Pendiente</p>
              <p className="font-mono text-xl font-bold text-yellow-400">{formatMoney(totalPending)}</p>
            </div>
          </div>
        </div>

        <FixedExpenseForm currentMonth={currentMonth} />
        <FixedExpenseList fixedExpenses={fixedExpenses} />
      </main>
    </>
  )
}
