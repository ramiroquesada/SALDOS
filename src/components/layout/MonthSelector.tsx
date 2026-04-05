'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatMonthLabel, prevMonth, nextMonth } from '@/lib/utils'

type MonthSelectorProps = {
  currentMonth: string
}

export function MonthSelector({ currentMonth }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', month)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(prevMonth(currentMonth))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 active:bg-white/20"
      >
        ‹
      </button>
      <span className="text-sm font-semibold capitalize text-white">
        {formatMonthLabel(currentMonth)}
      </span>
      <button
        onClick={() => navigate(nextMonth(currentMonth))}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 active:bg-white/20"
      >
        ›
      </button>
    </div>
  )
}
