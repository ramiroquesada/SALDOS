'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/income'
import { revalidatePath } from 'next/cache'
import type { CreateIncomeInput } from '@/types'

export async function createIncome(data: CreateIncomeInput) {
  const { userId, familyId, userName } = await requireAuth()
  await db.createIncome(familyId, userId, userName, data)
  revalidatePath('/dashboard/income')
}

export async function deleteIncome(id: string) {
  const { familyId } = await requireAuth()
  await db.deleteIncome(id, familyId)
  revalidatePath('/dashboard/income')
}
