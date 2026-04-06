import { prisma } from '@/lib/prisma'
import type { BudgetWithSpent } from '@/types'

export async function getBudgetsWithSpent(familyId: string, month: string): Promise<BudgetWithSpent[]> {
  const [categories, budgets, expenses] = await Promise.all([
    prisma.category.findMany({
      where: { familyId, type: 'variable' },
      select: { name: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
    prisma.budget.findMany({ where: { familyId, month } }),
    prisma.expense.findMany({
      where: { familyId, month },
      select: { amount: true, category: true },
    }),
  ])

  const spentByCategory = new Map<string, number>()
  for (const e of expenses) {
    spentByCategory.set(e.category, (spentByCategory.get(e.category) ?? 0) + e.amount)
  }

  return categories.map(({ name: category }) => {
    const budget = budgets.find((b) => b.category === category)
    return {
      category,
      limit: budget?.limit ?? null,
      spent: spentByCategory.get(category) ?? 0,
    }
  })
}

export async function upsertBudget(familyId: string, category: string, month: string, limit: number) {
  return prisma.budget.upsert({
    where: { familyId_category_month: { familyId, category, month } },
    create: { familyId, category, month, limit },
    update: { limit },
  })
}

export async function deleteBudget(familyId: string, category: string, month: string) {
  return prisma.budget.deleteMany({
    where: { familyId, category, month },
  })
}
