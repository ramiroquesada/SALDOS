'use client'

import { useState, useTransition } from 'react'
import { createExpensesFromReceipt, createFixedExpensesFromReceipt } from '@/actions/receipts'
import type { CategoryRow } from '@/types'

type ScannedItem = {
  name: string
  amount: number
  category: string
  type: 'variable' | 'fixed'
}

type Props = {
  items: ScannedItem[]
  variableCategories: CategoryRow[]
  fixedCategories: CategoryRow[]
  month: string
  onAddMorePhotos: () => void
  onClose: () => void
}

export function ReceiptReviewStep({
  items: initialItems,
  variableCategories,
  fixedCategories,
  month,
  onAddMorePhotos,
  onClose,
}: Props) {
  const [items, setItems] = useState<ScannedItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()

  function updateItem(index: number, patch: Partial<ScannedItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function categoriesFor(type: 'variable' | 'fixed'): CategoryRow[] {
    return type === 'variable' ? variableCategories : fixedCategories
  }

  function handleConfirm() {
    startTransition(async () => {
      const hasVariable = items.some((i) => i.type === 'variable')
      const hasFixed = items.some((i) => i.type === 'fixed')

      if (hasVariable) await createExpensesFromReceipt(items, month)
      if (hasFixed) await createFixedExpensesFromReceipt(items, month)

      onClose()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No hay ítems. Podés agregar más fotos o cerrar el scanner.
        </p>
      ) : (
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-gray-50 p-3">
              {/* Name row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  placeholder="Nombre del ítem"
                  className="h-9 flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
                />
                <button
                  onClick={() => removeItem(i)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400"
                  aria-label="Eliminar ítem"
                >
                  ×
                </button>
              </div>

              {/* Amount + Category + Type row */}
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={item.amount || ''}
                  onChange={(e) =>
                    updateItem(i, { amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Monto"
                  className="h-9 w-24 rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
                />
                <select
                  value={item.category}
                  onChange={(e) => updateItem(i, { category: e.target.value })}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-gray-200 px-2 text-sm focus:border-[#1a1a2e] focus:outline-none"
                >
                  {categoriesFor(item.type).map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.emoji ? `${cat.emoji} ` : ''}
                      {cat.name}
                    </option>
                  ))}
                </select>
                <select
                  value={item.type}
                  onChange={(e) =>
                    updateItem(i, {
                      type: e.target.value as 'variable' | 'fixed',
                      category:
                        e.target.value === 'variable'
                          ? (variableCategories[0]?.name ?? '')
                          : (fixedCategories[0]?.name ?? ''),
                    })
                  }
                  className="h-9 w-24 rounded-xl border border-gray-200 px-2 text-sm focus:border-[#1a1a2e] focus:outline-none"
                >
                  <option value="variable">Variable</option>
                  <option value="fixed">Fijo</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onAddMorePhotos}
          disabled={isPending}
          className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Foto más
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending || items.length === 0}
          className="h-11 flex-1 rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending
            ? 'Guardando...'
            : `Confirmar ${items.length} gasto${items.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
