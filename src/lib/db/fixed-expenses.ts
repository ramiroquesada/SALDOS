import { prisma } from '@/lib/prisma'
import type { CreateFixedExpenseInput } from '@/types'

export async function getFixedExpensesByMonth(familyId: string, month: string) {
  return prisma.fixedExpense.findMany({
    where: { familyId, month },
    orderBy: { category: 'asc' },
  })
}

export async function createFixedExpense(
  familyId: string,
  data: CreateFixedExpenseInput,
  month: string
) {
  return prisma.fixedExpense.create({
    data: {
      amount: data.amount,
      category: data.category,
      paid: false,
      month,
      familyId,
    },
  })
}

export async function toggleFixedExpensePaid(id: string, familyId: string, paid: boolean) {
  return prisma.fixedExpense.update({
    where: { id, familyId },
    data: { paid },
  })
}

export async function deleteFixedExpense(id: string, familyId: string) {
  return prisma.fixedExpense.delete({
    where: { id, familyId },
  })
}
