import { Suspense } from 'react'
import Link from 'next/link'
import { MonthSelector } from './MonthSelector'

type HeaderProps = {
  title: string
  currentMonth?: string
}

export function Header({ title, currentMonth }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#1a1a2e] px-4 py-3 shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-white">{title}</h1>
        <div className="flex items-center gap-1">
          {currentMonth && (
            <Suspense fallback={<div className="h-8 w-32 rounded animate-pulse bg-white/10" />}>
              <MonthSelector currentMonth={currentMonth} />
            </Suspense>
          )}
          <Link
            href="/dashboard/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Configuración"
          >
            ⚙️
          </Link>
        </div>
      </div>
    </header>
  )
}
