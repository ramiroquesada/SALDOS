'use client'

import { useState } from 'react'
import { ReceiptUploadStep } from './ReceiptUploadStep'
import { ReceiptProcessingStep } from './ReceiptProcessingStep'
import { ReceiptReviewStep } from './ReceiptReviewStep'
import type { CategoryRow } from '@/types'

type Step = 'upload' | 'processing' | 'review'

type ScannedItem = {
  name: string
  amount: number
  category: string
  type: 'variable' | 'fixed'
}

type Props = {
  type: 'variable' | 'fixed'
  variableCategories: CategoryRow[]
  fixedCategories: CategoryRow[]
  month: string
  onClose: () => void
}

const STEP_TITLES: Record<Step, string> = {
  upload: 'Escanear boleta',
  processing: 'Analizando...',
  review: 'Revisar gastos',
}

export function ReceiptScannerModal({
  type,
  variableCategories,
  fixedCategories,
  month,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [items, setItems] = useState<ScannedItem[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setStep('processing')
    setError(null)

    const formData = new FormData()
    files.forEach((file) => formData.append('images[]', file))
    formData.append('type', type)

    try {
      const res = await fetch('/api/receipts/scan', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(35_000),
      })
      const data = (await res.json()) as { items?: ScannedItem[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al analizar la boleta')
      setItems(data.items ?? [])
      setStep('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al analizar la boleta'
      setError(msg)
      // Stay on processing step to show error; user clicks "Volver" to go back
    }
  }

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel — bottom sheet on mobile, centered card on desktop */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white sm:rounded-3xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{STEP_TITLES[step]}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            aria-label="Cerrar scanner"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5">
          {step === 'upload' && (
            <ReceiptUploadStep
              files={files}
              onFilesChange={setFiles}
              onAnalyze={handleAnalyze}
            />
          )}
          {step === 'processing' && (
            <ReceiptProcessingStep
              error={error}
              onBack={() => setStep('upload')}
            />
          )}
          {step === 'review' && (
            <ReceiptReviewStep
              items={items}
              variableCategories={variableCategories}
              fixedCategories={fixedCategories}
              month={month}
              onAddMorePhotos={() => setStep('upload')}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
