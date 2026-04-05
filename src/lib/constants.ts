export const VARIABLE_CATEGORIES = [
  'Supermercado',
  'Farmacia',
  'Transporte',
  'Comida afuera',
  'Ropa',
  'Bebé',
  'Salud',
  'Hogar',
  'Ocio',
  'Otro',
] as const

export type VariableCategory = (typeof VARIABLE_CATEGORIES)[number]

export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: '#4CAF50',
  Farmacia: '#2196F3',
  Transporte: '#FF9800',
  'Comida afuera': '#F44336',
  Ropa: '#9C27B0',
  'Bebé': '#E91E63',
  Salud: '#00BCD4',
  Hogar: '#795548',
  Ocio: '#FF5722',
  Otro: '#607D8B',
}

export const FIXED_CATEGORIES = [
  'Alquiler',
  'UTE (Luz)',
  'OSE (Agua)',
  'Internet',
  'Celular',
  'Seguro',
  'Mutualista',
  'Otro',
] as const
