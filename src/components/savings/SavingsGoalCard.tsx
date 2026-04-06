import { formatMoney } from '@/lib/utils'
import type { SavingsGoal } from '@/types'

type Props = { goal: SavingsGoal }

export function SavingsGoalCard({ goal }: Props) {
  const pct = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0
  const barColor = pct >= 100 ? '#4CAF50' : pct >= 50 ? '#8BC34A' : '#2196F3'

  return (
    <div className="rounded-2xl bg-[#1a1a2e] p-5 text-white">
      <p className="text-xs text-white/60">Meta: {goal.name}</p>
      <p className="font-mono text-3xl font-bold text-green-400">{formatMoney(goal.saved)}</p>
      {goal.target > 0 && (
        <p className="text-xs text-white/40">de {formatMoney(goal.target)}</p>
      )}

      {goal.target > 0 && (
        <div className="mt-3">
          <div className="h-3 w-full rounded-full bg-white/10">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-white/40">{Math.round(pct)}%</p>
        </div>
      )}
    </div>
  )
}
