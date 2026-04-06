'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { addToSavings } from '@/actions/savings'

type Props = { goalId: string }

export function DepositForm({ goalId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) return

    startTransition(async () => {
      await addToSavings(goalId, parsed)
      setAmount('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">Agregar al ahorro</h2>

      <Input
        id="deposit-amount"
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

      <Button type="submit" size="lg" loading={isPending}>
        Depositar
      </Button>
    </form>
  )
}
