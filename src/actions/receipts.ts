'use server'

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ScannedItem = {
  name: string
  amount: number
  category: string
  type: 'variable' | 'fixed'
}

export async function createExpensesFromReceipt(
  items: ScannedItem[],
  month: string
) {
  const { familyId, userName } = await requireAuth()

  const varItems = items.filter((item) => item.type === 'variable')
  if (varItems.length === 0) return

  await prisma.expense.createMany({
    data: varItems.map((item) => ({
      familyId,
      amount: item.amount,
      category: item.category,
      description: item.name,
      spentBy: userName,
      month,
      receiptImageUrl: null,
      userId: '', // Placeholder: actual userId not passed to Prisma in this context
    })),
  })

  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}

export async function createFixedExpensesFromReceipt(
  items: ScannedItem[],
  month: string
) {
  const { familyId } = await requireAuth()

  const fixItems = items.filter((item) => item.type === 'fixed')
  if (fixItems.length === 0) return

  await prisma.fixedExpense.createMany({
    data: fixItems.map((item) => ({
      familyId,
      amount: item.amount,
      category: item.category,
      paid: false,
      month,
      receiptImageUrl: null,
    })),
  })

  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard')
}
