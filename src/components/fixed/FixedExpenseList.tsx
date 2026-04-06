'use client'

import { useState, useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { toggleFixedExpensePaid, deleteFixedExpense, updateFixedExpense } from '@/actions/fixed-expenses'
import { ReceiptImageViewer } from '@/components/receipt/ReceiptImageViewer'
import type { FixedExpense, CategoryRow } from '@/types'

type Props = {
  fixedExpenses: FixedExpense[]
  categories: CategoryRow[]
}

function FixedExpenseRow({
  item,
  categories,
}: {
  item: FixedExpense
  categories: CategoryRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState(false)
  const [amount, setAmount] = useState(String(item.amount))
  const [category, setCategory] = useState(item.category)

  function handleToggle() {
    startTransition(() => toggleFixedExpensePaid(item.id, !item.paid))
  }

  function handleDelete() {
    startTransition(() => deleteFixedExpense(item.id))
  }

  function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) return
    startTransition(async () => {
      await updateFixedExpense(item.id, { amount: parsed, category })
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
        {item.receiptImageUrl && (
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
          aria-label="Editar gasto fijo"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 active:scale-90 disabled:opacity-50"
          aria-label="Eliminar gasto fijo"
        >
          ×
        </button>
      </div>
      {viewingReceipt && item.receiptImageUrl && (
        <ReceiptImageViewer
          url={item.receiptImageUrl}
          onClose={() => setViewingReceipt(false)}
        />
      )}
    </>
  )
}

export function FixedExpenseList({ fixedExpenses, categories }: Props) {
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
        <FixedExpenseRow key={item.id} item={item} categories={categories} />
      ))}
    </div>
  )
}
