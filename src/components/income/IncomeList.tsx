'use client'

import { useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { deleteIncome } from '@/actions/income'
import type { Income } from '@/types'

type Props = { incomes: Income[] }

export function IncomeList({ incomes }: Props) {
  const [isPending, startTransition] = useTransition()

  if (incomes.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-2xl">💵</p>
        <p className="mt-2 text-sm text-gray-500">No hay ingresos registrados este mes.</p>
      </div>
    )
  }

  function handleDelete(id: string) {
    startTransition(() => deleteIncome(id))
  }

  return (
    <div className="space-y-2">
      {incomes.map((income) => (
        <div
          key={income.id}
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {income.description ?? 'Ingreso'}
            </p>
            <p className="text-xs text-gray-400">{income.earnedBy}</p>
          </div>

          <span className="font-mono text-sm font-semibold text-green-600">
            {formatMoney(income.amount)}
          </span>

          <button
            onClick={() => handleDelete(income.id)}
            disabled={isPending}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 active:scale-90 disabled:opacity-50"
            aria-label="Eliminar ingreso"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
