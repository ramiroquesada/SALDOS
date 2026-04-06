'use client'

type Props = {
  error: string | null
  onBack: () => void
}

export function ReceiptProcessingStep({ error, onBack }: Props) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <span className="text-4xl">⚠️</span>
        <p className="text-center text-sm text-gray-700">{error}</p>
        <button
          onClick={onBack}
          className="h-11 rounded-xl bg-gray-100 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a1a2e]" />
      <p className="text-sm text-gray-500">Analizando boleta...</p>
    </div>
  )
}
