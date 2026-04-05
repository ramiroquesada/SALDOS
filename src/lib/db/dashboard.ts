import { prisma } from '@/lib/prisma'

export type DashboardData = {
  totalIncome: number
  totalVariableExpenses: number
  totalFixedExpenses: number
  balance: number
  expensesByCategory: { category: string; total: number }[]
}

export async function getDashboardData(familyId: string, month: string): Promise<DashboardData> {
  const [incomes, expenses, fixedExpenses] = await Promise.all([
    prisma.income.findMany({ where: { familyId, month }, select: { amount: true } }),
    prisma.expense.findMany({ where: { familyId, month }, select: { amount: true, category: true } }),
    // Suma todos los gastos fijos (pagados y no pagados) — vista presupuestaria:
    // todos los compromisos del mes se descuentan del balance, independientemente de si ya se pagaron
    prisma.fixedExpense.findMany({ where: { familyId, month }, select: { amount: true } }),
  ])

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const totalVariableExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalFixedExpenses = fixedExpenses.reduce((sum, e) => sum + e.amount, 0)
  const balance = totalIncome - totalVariableExpenses - totalFixedExpenses

  // Agrupar gastos variables por categoría
  const categoryMap = new Map<string, number>()
  for (const expense of expenses) {
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + expense.amount)
  }
  const expensesByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return { totalIncome, totalVariableExpenses, totalFixedExpenses, balance, expensesByCategory }
}
