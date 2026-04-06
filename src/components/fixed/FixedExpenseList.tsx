'use client'

import { useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { toggleFixedExpensePaid, deleteFixedExpense } from '@/actions/fixed-expenses'
import type { FixedExpense, CategoryRow } from '@/types'

type Props = { fixedExpenses: FixedExpense[]; categories?: CategoryRow[] }

function FixedExpenseRow({ item }: { item: FixedExpense }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(() => toggleFixedExpensePaid(item.id, !item.paid))
  }

  function handleDelete() {
    startTransition(() => deleteFixedExpense(item.id))
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 ${
          item.paid
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 bg-white text-transparent'
        }`}
        aria-label={item.paid ? 'Marcar como no pagado' : 'Marcar como pagado'}
      >
        ✓
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${item.paid ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {item.category}
        </p>
      </div>

      <span className={`font-mono text-sm font-semibold ${item.paid ? 'text-gray-400' : 'text-gray-900'}`}>
        {formatMoney(item.amount)}
      </span>

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 active:scale-90 disabled:opacity-50"
        aria-label="Eliminar gasto fijo"
      >
        ×
      </button>
    </div>
  )
}

export function FixedExpenseList({ fixedExpenses, categories: _categories }: Props) {
  if (fixedExpenses.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-2xl">📋</p>
        <p className="mt-2 text-sm text-gray-500">No hay gastos fijos este mes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {fixedExpenses.map((item) => (
        <FixedExpenseRow key={item.id} item={item} />
      ))}
    </div>
  )
}
