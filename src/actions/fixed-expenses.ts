'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/fixed-expenses'
import { revalidatePath } from 'next/cache'
import type { CreateFixedExpenseInput, UpdateFixedExpenseInput } from '@/types'

export async function createFixedExpense(data: CreateFixedExpenseInput, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid month format')
  const { familyId } = await requireAuth()
  await db.createFixedExpense(familyId, month, data)
  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard')
}

export async function toggleFixedExpensePaid(id: string, paid: boolean) {
  const { familyId } = await requireAuth()
  await db.toggleFixedExpensePaid(id, familyId, paid)
  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard')
}

export async function deleteFixedExpense(id: string) {
  const { familyId } = await requireAuth()
  await db.deleteFixedExpense(id, familyId)
  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard')
}

export async function updateFixedExpense(id: string, data: UpdateFixedExpenseInput) {
  const { familyId } = await requireAuth()
  await db.updateFixedExpense(id, familyId, data)
  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard')
}
