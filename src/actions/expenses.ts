'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/expenses'
import { revalidatePath } from 'next/cache'
import type { CreateExpenseInput, UpdateExpenseInput } from '@/types'

export async function createExpense(data: CreateExpenseInput) {
  const { userId, familyId, userName } = await requireAuth()
  await db.createExpense(familyId, userId, userName, data)
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}

export async function deleteExpense(id: string) {
  const { familyId } = await requireAuth()
  await db.deleteExpense(id, familyId)
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}

export async function updateExpense(id: string, data: UpdateExpenseInput) {
  const { familyId } = await requireAuth()
  await db.updateExpense(id, familyId, data)
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}
