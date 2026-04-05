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
