'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/categories'
import { revalidatePath } from 'next/cache'

export async function addCategory(name: string, emoji: string | null, type: 'variable' | 'fixed') {
  const { familyId } = await requireAuth()
  if (!name.trim()) throw new Error('Nombre requerido')
  await db.createCategory(familyId, name.trim(), emoji, type)
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard/budget')
}

export async function removeCategory(id: string) {
  const { familyId } = await requireAuth()
  await db.deleteCategory(id, familyId)
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard/budget')
}
