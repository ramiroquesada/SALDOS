'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/budget'
import { revalidatePath } from 'next/cache'

export async function setBudget(category: string, month: string, limit: number) {
  const { familyId } = await requireAuth()
  if (limit <= 0) throw new Error('Límite inválido')
  await db.upsertBudget(familyId, category, month, limit)
  revalidatePath('/dashboard/budget')
}

export async function removeBudget(category: string, month: string) {
  const { familyId } = await requireAuth()
  await db.deleteBudget(familyId, category, month)
  revalidatePath('/dashboard/budget')
}
