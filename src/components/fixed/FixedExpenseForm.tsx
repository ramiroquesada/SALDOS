'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FIXED_CATEGORIES } from '@/lib/constants'
import { createFixedExpense } from '@/actions/fixed-expenses'

type Props = { currentMonth: string }

export function FixedExpenseForm({ currentMonth }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(FIXED_CATEGORIES[0])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) return

    startTransition(async () => {
      await createFixedExpense({ amount: parsed, category }, currentMonth)
      setAmount('')
      setCategory(FIXED_CATEGORIES[0])
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">Nuevo gasto fijo</h2>

      <Input
        id="amount"
        label="Monto"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Categoría
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
        >
          {FIXED_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" loading={isPending}>
        Agregar gasto fijo
      </Button>
    </form>
  )
}
