'use client'

import { useTransition } from 'react'
import { removeCategory } from '@/actions/categories'
import type { CategoryRow } from '@/types'

type Props = {
  categories: CategoryRow[]
  type: 'variable' | 'fixed'
}

export function CategoryList({ categories }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(() => removeCategory(id))
  }

  if (categories.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-4">No hay categorías aún.</p>
  }

  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          {cat.emoji ? (
            <span className="text-lg">{cat.emoji}</span>
          ) : (
            <span className="h-6 w-6 rounded-full bg-gray-100" />
          )}
          <span className="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
          {cat.isDefault ? (
            <span className="text-xs text-gray-300" title="Categoría predeterminada">🔒</span>
          ) : (
            <button
              onClick={() => handleDelete(cat.id)}
              disabled={isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 active:scale-90 disabled:opacity-50"
              aria-label="Eliminar categoría"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
