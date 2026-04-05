import { prisma } from '@/lib/prisma'
import { getMonthKey } from '@/lib/utils'
import type { CreateExpenseInput } from '@/types'

export async function getExpensesByMonth(familyId: string, month: string) {
  return prisma.expense.findMany({
    where: { familyId, month },
    orderBy: { date: 'desc' },
  })
}

export async function createExpense(
  familyId: string,
  userId: string,
  spentBy: string,
  data: CreateExpenseInput
) {
  const date = data.date ? new Date(data.date) : new Date()
  return prisma.expense.create({
    data: {
      amount: data.amount,
      description: data.description ?? null,
      category: data.category,
      spentBy,
      date,
      month: getMonthKey(date),
      familyId,
      userId,
    },
  })
}

export async function deleteExpense(id: string, familyId: string) {
  // El familyId en la condición evita eliminar gastos de otras familias
  return prisma.expense.delete({
    where: { id, familyId },
  })
}
