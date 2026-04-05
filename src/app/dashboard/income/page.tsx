import { requireAuth } from '@/lib/auth'
import { getIncomeByMonth } from '@/lib/db/income'
import { getMonthKey, formatMoney } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { IncomeForm } from '@/components/income/IncomeForm'
import { IncomeList } from '@/components/income/IncomeList'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function IncomePage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const incomes = await getIncomeByMonth(familyId, currentMonth)
  const total = incomes.reduce((sum, i) => sum + i.amount, 0)

  return (
    <>
      <Header title="Ingresos" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        {/* Total */}
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
          <p className="text-xs text-white/60">Total ingresos del mes</p>
          <p className="font-mono text-2xl font-bold text-green-400">{formatMoney(total)}</p>
          <p className="text-xs text-white/40">{incomes.length} registros</p>
        </div>

        <IncomeForm />
        <IncomeList incomes={incomes} />
      </main>
    </>
  )
}
