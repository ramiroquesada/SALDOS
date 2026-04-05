import { prisma } from '@/lib/prisma'
import { getMonthKey } from '@/lib/utils'
import type { CreateIncomeInput } from '@/types'

export async function getIncomeByMonth(familyId: string, month: string) {
  return prisma.income.findMany({
    where: { familyId, month },
    orderBy: { date: 'desc' },
  })
}

export async function createIncome(
  familyId: string,
  userId: string,
  earnedBy: string,
  data: CreateIncomeInput
) {
  const date = new Date()
  return prisma.income.create({
    data: {
      amount: data.amount,
      description: data.description ?? null,
      earnedBy,
      date,
      month: getMonthKey(date),
      familyId,
      userId,
    },
  })
}

export async function deleteIncome(id: string, familyId: string) {
  // El familyId en la condición evita eliminar registros de otras familias
  return prisma.income.delete({
    where: { id, familyId },
  })
}
