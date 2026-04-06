import { prisma } from '@/lib/prisma'
import type { UpdateSavingsGoalInput } from '@/types'

export async function getOrCreateSavingsGoal(familyId: string) {
  const existing = await prisma.savingsGoal.findFirst({ where: { familyId } })
  if (existing) return existing
  return prisma.savingsGoal.create({
    data: { familyId, name: 'Ahorro', target: 0, saved: 0 },
  })
}

export async function updateSavingsGoalMeta(id: string, familyId: string, data: UpdateSavingsGoalInput) {
  return prisma.savingsGoal.update({
    where: { id, familyId },
    data,
  })
}

export async function addToSaved(id: string, familyId: string, amount: number) {
  return prisma.savingsGoal.update({
    where: { id, familyId },
    data: { saved: { increment: amount } },
  })
}
