import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatMoney(amount: number): string {
  return `$ ${amount.toLocaleString('es-UY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('es-UY', { month: 'long', year: 'numeric' })
}

export function prevMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return getMonthKey(date)
}

export function nextMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month, 1)
  return getMonthKey(date)
}
