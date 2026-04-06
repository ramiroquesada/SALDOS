export type Expense = {
  id: string
  amount: number
  description: string | null
  category: string
  spentBy: string
  date: Date
  month: string
  familyId: string
  userId: string
  createdAt: Date
}

export type CreateExpenseInput = {
  amount: number
  description?: string
  category: string
  date?: string // ISO string desde el formulario
  // spentBy viene de requireAuth().userName, no del formulario
}

export type FixedExpense = {
  id: string
  amount: number
  category: string
  paid: boolean
  month: string
  familyId: string
}

export type CreateFixedExpenseInput = {
  amount: number
  category: string
  // month y familyId vienen del contexto de auth, no del formulario
}

export type Income = {
  id: string
  amount: number
  description: string | null
  earnedBy: string
  date: Date
  month: string
  familyId: string
  userId: string
  createdAt: Date
}

export type CreateIncomeInput = {
  amount: number
  description?: string
  // earnedBy viene de requireAuth().userName, no del formulario
}

export type SavingsGoal = {
  id: string
  name: string
  target: number
  saved: number
  familyId: string
}

export type UpdateSavingsGoalInput = {
  name?: string
  target?: number
}

export type Budget = {
  id: string
  category: string
  limit: number
  month: string
  familyId: string
}

export type BudgetWithSpent = {
  category: string
  limit: number | null
  spent: number
}
