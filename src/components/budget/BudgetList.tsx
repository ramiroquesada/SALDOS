'use client'

import { useState, useTransition } from 'react'
import { formatMoney } from '@/lib/utils'
import { setBudget, removeBudget } from '@/actions/budget'
import { CATEGORY_COLORS } from '@/lib/constants'
import type { BudgetWithSpent } from '@/types'

type Props = {
  items: BudgetWithSpent[]
  currentMonth: string
}

export function BudgetList({ items, currentMonth }: Props) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [isPending, startTransition] = useTransition()

  function startEdit(item: BudgetWithSpent) {
    setEditingCategory(item.category)
    setLimitInput(item.limit != null ? String(item.limit) : '')
  }

  function handleSave(category: string) {
    const parsed = parseFloat(limitInput.replace(',', '.'))
    if (!parsed || parsed <= 0) return
    startTransition(async () => {
      await setBudget(category, currentMonth, parsed)
      setEditingCategory(null)
    })
  }

  function handleRemove(category: string) {
    startTransition(async () => {
      await removeBudget(category, currentMonth)
      setEditingCategory(null)
    })
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = item.limit != null && item.limit > 0
          ? Math.min((item.spent / item.limit) * 100, 100)
          : 0
        const barColor =
          item.limit == null ? '#E0E0E0'
          : pct >= 100 ? '#F44336'
          : pct >= 80 ? '#FF9800'
          : CATEGORY_COLORS[item.category] ?? '#607D8B'
        const isEditing = editingCategory === item.category

        return (
          <div key={item.category} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">{item.category}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-600">{formatMoney(item.spent)}</span>
                {item.limit != null && (
                  <span className="text-xs text-gray-400">/ {formatMoney(item.limit)}</span>
                )}
                <button
                  onClick={() => isEditing ? setEditingCategory(null) : startEdit(item)}
                  className="text-xs text-[#1a1a2e] underline"
                >
                  {isEditing ? 'Cancelar' : item.limit != null ? 'Editar' : 'Fijar'}
                </button>
              </div>
            </div>

            {item.limit != null && (
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            )}

            {isEditing && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="Límite $"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
                />
                <button
                  onClick={() => handleSave(item.category)}
                  disabled={isPending}
                  className="h-10 rounded-xl bg-[#1a1a2e] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Guardar
                </button>
                {item.limit != null && (
                  <button
                    onClick={() => handleRemove(item.category)}
                    disabled={isPending}
                    className="h-10 rounded-xl bg-red-50 px-3 text-sm font-semibold text-red-500 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
