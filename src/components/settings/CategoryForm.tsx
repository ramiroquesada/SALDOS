'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { addCategory } from '@/actions/categories'

type Props = { type: 'variable' | 'fixed' }

export function CategoryForm({ type }: Props) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      await addCategory(name.trim(), emoji.trim() || null, type)
      setName('')
      setEmoji('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="text"
        placeholder="😀"
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        maxLength={2}
        className="h-11 w-14 rounded-xl border border-gray-200 px-2 text-center text-lg focus:border-[#1a1a2e] focus:outline-none"
      />
      <input
        type="text"
        placeholder="Nueva categoría..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
      />
      <Button type="submit" size="sm" loading={isPending}>
        Agregar
      </Button>
    </form>
  )
}
