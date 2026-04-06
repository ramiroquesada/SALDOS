'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createIncome } from '@/actions/income'

type Props = { currentMonth: string }

export function IncomeForm({ currentMonth }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) return

    startTransition(async () => {
      await createIncome({
        amount: parsed,
        description: description.trim() || undefined,
      }, currentMonth)
      setAmount('')
      setDescription('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">Nuevo ingreso</h2>

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

      <Input
        id="description"
        label="Descripción (opcional)"
        type="text"
        placeholder="Sueldo, freelance..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Button type="submit" size="lg" loading={isPending}>
        Agregar ingreso
      </Button>
    </form>
  )
}
