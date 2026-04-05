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
