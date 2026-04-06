'use client'

import { useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/constants'
import { deleteExpense } from '@/actions/expenses'
import type { Expense, CategoryRow } from '@/types'

type ExpenseListProps = {
  expenses: Expense[]
  categories?: CategoryRow[]
}

export function ExpenseList({ expenses, categories: _categories }: ExpenseListProps) {
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
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[expense.category] ?? '#607D8B' }}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {expense.description ?? expense.category}
            </p>
            <p className="text-xs text-gray-400">
              {expense.category} · {expense.spentBy}
            </p>
          </div>

          <span className="font-mono text-sm font-semibold text-gray-900">
            {formatMoney(expense.amount)}
          </span>

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
