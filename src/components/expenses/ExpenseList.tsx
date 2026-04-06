'use client'

import { useState, useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/constants'
import { deleteExpense, updateExpense } from '@/actions/expenses'
import { ReceiptImageViewer } from '@/components/receipt/ReceiptImageViewer'
import type { Expense, CategoryRow } from '@/types'

type Props = {
  expenses: Expense[]
  categories: CategoryRow[]
}

function ExpenseRow({ expense, categories }: { expense: Expense; categories: CategoryRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState(false)
  const [amount, setAmount] = useState(String(expense.amount))
  const [description, setDescription] = useState(expense.description ?? '')
  const [category, setCategory] = useState(expense.category)

  function handleDelete() {
    startTransition(() => deleteExpense(expense.id))
  }

  function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) return
    startTransition(async () => {
      await updateExpense(expense.id, {
        amount: parsed,
        description: description.trim() || null,
        category,
      })
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
          placeholder="Monto"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
          placeholder="Descripción (opcional)"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="h-10 px-4 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
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
        {expense.receiptImageUrl && (
          <button
            onClick={() => setViewingReceipt(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 active:scale-90"
            aria-label="Ver boleta"
          >
            📷
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          disabled={isPending}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-blue-50 hover:text-blue-400 active:scale-90 disabled:opacity-50"
          aria-label="Editar gasto"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 active:scale-90 disabled:opacity-50"
          aria-label="Eliminar gasto"
        >
          ×
        </button>
      </div>
      {viewingReceipt && expense.receiptImageUrl && (
        <ReceiptImageViewer
          url={expense.receiptImageUrl}
          onClose={() => setViewingReceipt(false)}
        />
      )}
    </>
  )
}

export function ExpenseList({ expenses, categories }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-2xl">🌟</p>
        <p className="mt-2 text-sm text-gray-500">No hay gastos este mes todavía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} categories={categories} />
      ))}
    </div>
  )
}
