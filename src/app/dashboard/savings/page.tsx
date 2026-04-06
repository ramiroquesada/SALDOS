import { requireAuth } from '@/lib/auth'
import { getOrCreateSavingsGoal } from '@/lib/db/savings'
import { Header } from '@/components/layout/Header'
import { SavingsGoalCard } from '@/components/savings/SavingsGoalCard'
import { SavingsGoalForm } from '@/components/savings/SavingsGoalForm'
import { DepositForm } from '@/components/savings/DepositForm'

export default async function SavingsPage() {
  const { familyId } = await requireAuth()
  const goal = await getOrCreateSavingsGoal(familyId)

  return (
    <>
      <Header title="Ahorro" />

      <main className="space-y-4 px-4 py-4">
        <SavingsGoalCard goal={goal} />
        <DepositForm goalId={goal.id} />
        <SavingsGoalForm goal={goal} />
      </main>
    </>
  )
}
