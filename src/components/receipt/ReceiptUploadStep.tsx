'use client'

import { useRef } from 'react'
import { compressImage } from './compressImage'

type Props = {
  files: File[]
  onFilesChange: (files: File[]) => void
  onAnalyze: () => void
}

export function ReceiptUploadStep({ files, onFilesChange, onAnalyze }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return
    const compressed = await Promise.all(Array.from(selected).map(compressImage))
    onFilesChange([...files, ...compressed])
    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Drop zone — tap on mobile opens camera/gallery, drag on desktop */}
      <div
        className="relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition-colors hover:border-[#1a1a2e] hover:bg-gray-100"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
      >
        <span className="text-3xl">📷</span>
        <p className="mt-2 text-sm font-medium text-gray-700">
          Tocá para seleccionar fotos
        </p>
        <p className="mt-1 hidden text-xs text-gray-400 sm:block">
          o arrastrá y soltá acá
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview thumbnails */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative h-20 w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={`Foto ${i + 1}`}
                className="h-full w-full rounded-xl object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(i)
                }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow"
                aria-label={`Eliminar foto ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={files.length === 0}
        className="h-11 w-full rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white disabled:opacity-40"
      >
        Analizar boleta
      </button>
    </div>
  )
}
