'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { updateSavingsGoal } from '@/actions/savings'
import type { SavingsGoal } from '@/types'

type Props = { goal: SavingsGoal }

export function SavingsGoalForm({ goal }: Props) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(goal.name)
  const [target, setTarget] = useState(goal.target > 0 ? String(goal.target) : '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTarget = parseFloat(target.replace(',', '.'))
    startTransition(async () => {
      await updateSavingsGoal(goal.id, {
        name: name.trim() || 'Ahorro',
        target: parsedTarget > 0 ? parsedTarget : 0,
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">Configurar meta</h2>

      <Input
        id="name"
        label="Nombre"
        type="text"
        placeholder="Ahorro, Vacaciones, Bebé..."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Input
        id="target"
        label="Meta ($)"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder="0"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />

      <Button type="submit" size="lg" loading={isPending}>
        Guardar meta
      </Button>
    </form>
  )
}
