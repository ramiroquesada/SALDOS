import { prisma } from '@/lib/prisma'
import type { CategoryRow } from '@/types'

const VARIABLE_DEFAULTS = [
  'Supermercado', 'Farmacia', 'Transporte', 'Comida afuera',
  'Ropa', 'Bebé', 'Salud', 'Hogar', 'Ocio', 'Otro',
]

const FIXED_DEFAULTS = [
  'Alquiler', 'UTE (Luz)', 'OSE (Agua)', 'Internet',
  'Celular', 'Seguro', 'Mutualista', 'Otro',
]

export async function getCategoriesByFamily(
  familyId: string,
  type: 'variable' | 'fixed'
): Promise<CategoryRow[]> {
  return prisma.category.findMany({
    where: { familyId, type },
    select: { id: true, name: true, emoji: true, isDefault: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
}

export async function createCategory(
  familyId: string,
  name: string,
  emoji: string | null,
  type: 'variable' | 'fixed'
) {
  return prisma.category.create({
    data: { familyId, name, emoji, type, isDefault: false },
  })
}

export async function deleteCategory(id: string, familyId: string) {
  return prisma.category.deleteMany({
    where: { id, familyId, isDefault: false },
  })
}

export async function seedDefaultCategories(familyId: string) {
  const data = [
    ...VARIABLE_DEFAULTS.map((name) => ({
      name,
      type: 'variable',
      familyId,
      isDefault: true,
      emoji: null,
    })),
    ...FIXED_DEFAULTS.map((name) => ({
      name,
      type: 'fixed',
      familyId,
      isDefault: true,
      emoji: null,
    })),
  ]
  await prisma.category.createMany({ data, skipDuplicates: true })
}
