'use client'

import { useState } from 'react'
import { ReceiptScannerModal } from './ReceiptScannerModal'
import type { CategoryRow } from '@/types'

type Props = {
  type: 'variable' | 'fixed'
  variableCategories: CategoryRow[]
  fixedCategories: CategoryRow[]
  month: string
}

export function ReceiptScannerButton({
  type,
  variableCategories,
  fixedCategories,
  month,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.98]"
      >
        <span>📷</span>
        <span>Escanear boleta</span>
      </button>

      {open && (
        <ReceiptScannerModal
          type={type}
          variableCategories={variableCategories}
          fixedCategories={fixedCategories}
          month={month}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
