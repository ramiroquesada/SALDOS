'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', emoji: '🏠' },
  { href: '/dashboard/expenses', label: 'Gastos', emoji: '💸' },
  { href: '/dashboard/fixed', label: 'Fijos', emoji: '📋' },
  { href: '/dashboard/income', label: 'Ingresos', emoji: '💵' },
  { href: '/dashboard/savings', label: 'Ahorro', emoji: '🎯' },
  { href: '/dashboard/budget', label: 'Presup.', emoji: '📊' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around border-t border-gray-100 bg-white shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1',
              isActive ? 'text-[#1a1a2e]' : 'text-gray-400'
            )}
          >
            <span className="text-xl leading-none">{item.emoji}</span>
            <span className={cn('text-[10px]', isActive && 'font-semibold')}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
