import { requireAuth } from '@/lib/auth'
import { getBudgetsWithSpent } from '@/lib/db/budget'
import { getMonthKey, formatMoney } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { BudgetList } from '@/components/budget/BudgetList'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function BudgetPage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const items = await getBudgetsWithSpent(familyId, currentMonth)

  const totalSpent = items.reduce((sum, i) => sum + i.spent, 0)
  const totalLimit = items.reduce((sum, i) => sum + (i.limit ?? 0), 0)
  const overBudgetCount = items.filter((i) => i.limit != null && i.spent > i.limit).length

  return (
    <>
      <Header title="Presupuesto" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        {/* Resumen */}
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-white/60">Gastado</p>
              <p className="font-mono text-xl font-bold text-white">{formatMoney(totalSpent)}</p>
            </div>
            {totalLimit > 0 && (
              <div className="text-right">
                <p className="text-xs text-white/60">Presupuesto total</p>
                <p className="font-mono text-xl font-bold text-white">{formatMoney(totalLimit)}</p>
              </div>
            )}
          </div>
          {overBudgetCount > 0 && (
            <p className="mt-2 text-xs text-red-400">
              ⚠️ {overBudgetCount} {overBudgetCount === 1 ? 'categoría excedida' : 'categorías excedidas'}
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400 px-1">
          Tocá "Fijar" para establecer un límite mensual por categoría.
        </p>

        <BudgetList items={items} currentMonth={currentMonth} />
      </main>
    </>
  )
}
