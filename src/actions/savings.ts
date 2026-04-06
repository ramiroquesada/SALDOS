'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/savings'
import { revalidatePath } from 'next/cache'
import type { UpdateSavingsGoalInput } from '@/types'

export async function updateSavingsGoal(id: string, data: UpdateSavingsGoalInput) {
  const { familyId } = await requireAuth()
  await db.updateSavingsGoalMeta(id, familyId, data)
  revalidatePath('/dashboard/savings')
}

export async function addToSavings(id: string, amount: number) {
  const { familyId } = await requireAuth()
  if (amount <= 0) throw new Error('Monto inválido')
  await db.addToSaved(id, familyId, amount)
  revalidatePath('/dashboard/savings')
}
