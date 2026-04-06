import { describe, it, expect } from 'vitest'
import { formatMoney, getMonthKey, formatMonthLabel } from '@/lib/utils'

describe('formatMoney', () => {
  it('formatea números enteros con símbolo $', () => {
    expect(formatMoney(1000)).toBe('$ 1.000')
  })

  it('formatea cero correctamente', () => {
    expect(formatMoney(0)).toBe('$ 0')
  })

  it('formatea números grandes', () => {
    expect(formatMoney(50000)).toBe('$ 50.000')
  })
})

describe('getMonthKey', () => {
  it('retorna formato YYYY-MM', () => {
    const result = getMonthKey(new Date(2026, 3, 15))
    expect(result).toBe('2026-04')
  })

  it('usa la fecha actual cuando no se pasa argumento', () => {
    const result = getMonthKey()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })

  it('maneja correctamente meses con un dígito', () => {
    expect(getMonthKey(new Date(2026, 0, 1))).toBe('2026-01')
  })
})

describe('formatMonthLabel', () => {
  it('retorna el nombre del mes en español', () => {
    const result = formatMonthLabel('2026-04')
    expect(result).toContain('abril')
    expect(result).toContain('2026')
  })
})
