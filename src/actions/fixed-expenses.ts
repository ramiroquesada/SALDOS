'use server'

import { requireAuth } from '@/lib/auth'
import { getMonthKey } from '@/lib/utils'
import * as db from '@/lib/db/fixed-expenses'
import { revalidatePath } from 'next/cache'
import type { CreateFixedExpenseInput } from '@/types'

export async function createFixedExpense(data: CreateFixedExpenseInput, month: string) {
  const { familyId } = await requireAuth()
  await db.createFixedExpense(familyId, month, data)
  revalidatePath('/dashboard/fixed')
}

export async function toggleFixedExpensePaid(id: string, paid: boolean) {
  const { familyId } = await requireAuth()
  await db.toggleFixedExpensePaid(id, familyId, paid)
  revalidatePath('/dashboard/fixed')
}

export async function deleteFixedExpense(id: string) {
  const { familyId } = await requireAuth()
  await db.deleteFixedExpense(id, familyId)
  revalidatePath('/dashboard/fixed')
}
