# Fase 4B: Scanner de Boletas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un scanner de boletas con Gemini 1.5 Flash que extrae ítems individuales de fotos, permite al usuario revisarlos y confirmarlos como gastos, y guarda la foto en Supabase Storage como respaldo.

**Architecture:** El usuario sube fotos en un modal de 3 pasos (upload → procesando → revisar). El cliente comprime las imágenes con Canvas API y las envía al Route Handler `/api/receipts/scan`, que llama Gemini 1.5 Flash y retorna los ítems en JSON. El usuario edita y confirma; el cliente sube las imágenes a Supabase Storage, obtiene una URL firmada, y llama Server Actions para crear los gastos con `receiptImageUrl`.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, `@google/generative-ai`, Supabase Storage (browser client), TypeScript

**Working directory:** `PROYECTO SALDOS/` (all commands from `C:\Users\ramir\Desktop\SALDOS\PROYECTO SALDOS`)

---

## Prerequisitos manuales (antes de Task 1)

El usuario debe hacer estas dos cosas antes de ejecutar el plan:

**1. Crear el bucket `receipts` en Supabase Storage:**
- Ir a Supabase Dashboard → Storage → New bucket
- Name: `receipts`
- Toggle: **Private** (no público)
- Click "Save"
- Ir a Policies → New policy → For full customization:
  ```sql
  -- Permite a usuarios autenticados subir archivos
  CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');
  
  -- Permite a usuarios autenticados leer sus archivos
  CREATE POLICY "Authenticated users can read receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');
  ```

**2. Agregar `GEMINI_API_KEY` en `.env.local`:**
```env
GEMINI_API_KEY=<tu clave de Google AI Studio>
```

---

## Mapa de archivos

**Nuevos:**

| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/receipt/compressImage.ts` | Canvas API: redimensiona a max 1200px, JPEG 0.75 |
| `src/components/receipt/ReceiptUploadStep.tsx` | Paso 1: drag & drop + file input + thumbnails |
| `src/components/receipt/ReceiptProcessingStep.tsx` | Paso 2: spinner + manejo de errores |
| `src/components/receipt/ReceiptReviewStep.tsx` | Paso 3: lista editable + upload a Storage + confirm |
| `src/components/receipt/ReceiptScannerModal.tsx` | Wrapper modal: maneja estado de 3 pasos |
| `src/components/receipt/ReceiptScannerButton.tsx` | Client island: botón + opens modal con estado |
| `src/app/api/receipts/scan/route.ts` | Route Handler: recibe FormData, llama Gemini, retorna JSON |
| `src/actions/receipts.ts` | createExpensesFromReceipt, createFixedExpensesFromReceipt |

**Modificados:**

| Archivo | Cambio |
|---------|--------|
| `src/app/dashboard/expenses/page.tsx` | + fetch fixedCategories + `<ReceiptScannerButton>` |
| `src/app/dashboard/fixed/page.tsx` | + fetch variableCategories + `<ReceiptScannerButton>` |

---

## Task 1: Setup — instalar @google/generative-ai + compressImage

**Files:**
- Create: `src/components/receipt/compressImage.ts`

- [ ] **Step 1: Instalar el paquete de Gemini**

```bash
npm install @google/generative-ai
```

Expected: paquete agregado a `package.json`, `node_modules/@google/generative-ai` existe.

- [ ] **Step 2: Crear `src/components/receipt/compressImage.ts`**

```typescript
/**
 * Compresses an image file using Canvas API.
 * Resizes to max 1200px on the longest side, outputs JPEG at 0.75 quality.
 * Runs entirely in the browser — no external libraries.
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const MAX = 1200
      let { width, height } = img

      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          const outputName = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob!], outputName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.75
      )
    }

    img.src = objectUrl
  })
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output (cero errores).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/receipt/compressImage.ts
git commit -m "feat: install @google/generative-ai and add compressImage canvas utility"
```

---

## Task 2: Route Handler — POST /api/receipts/scan

**Files:**
- Create: `src/app/api/receipts/scan/route.ts`

- [ ] **Step 1: Crear el directorio y el Route Handler**

Crear `src/app/api/receipts/scan/route.ts` con el siguiente contenido exacto:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  // 1. Validate auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const familyId = user.user_metadata?.familyId as string | undefined
  if (!familyId) {
    return NextResponse.json({ error: 'Sin familia asignada' }, { status: 401 })
  }

  // 2. Parse FormData
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
  }

  const imageFiles = formData.getAll('images[]') as File[]
  const type = formData.get('type') as string

  if (!imageFiles.length) {
    return NextResponse.json({ error: 'Sin imágenes' }, { status: 400 })
  }
  if (type !== 'variable' && type !== 'fixed') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  // 3. Load family categories for the prompt
  const [variableCategories, fixedCategories] = await Promise.all([
    prisma.category.findMany({
      where: { familyId, type: 'variable' },
      select: { name: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
    prisma.category.findMany({
      where: { familyId, type: 'fixed' },
      select: { name: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
  ])

  const varNames = variableCategories.map((c) => c.name).join(', ')
  const fixNames = fixedCategories.map((c) => c.name).join(', ')

  // 4. Convert images to base64 for Gemini
  const imageParts = await Promise.all(
    imageFiles.map(async (file) => {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      return {
        inlineData: {
          data: base64,
          mimeType: (file.type || 'image/jpeg') as string,
        },
      }
    })
  )

  // 5. Build prompt
  const prompt = `Sos un asistente que extrae ítems de boletas y facturas.
Analizá la/s imagen/s y devolvé ÚNICAMENTE un JSON con todos los ítems individuales. No incluyas subtotales ni totales generales.
Si un monto no es legible, usá 0.

Categorías disponibles para gastos variables: ${varNames}
Categorías disponibles para gastos fijos: ${fixNames}

Formato de respuesta (solo JSON válido, sin texto adicional):
{
  "items": [
    {
      "name": "nombre del ítem",
      "amount": 123.45,
      "category": "categoría exacta de la lista",
      "type": "variable"
    }
  ]
}`

  // 6. Call Gemini 1.5 Flash
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([prompt, ...imageParts])
    const text = result.response.text()

    // Gemini sometimes wraps JSON in ```json ... ``` — extract raw JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Gemini no devolvió JSON válido')
    }

    const parsed = JSON.parse(jsonMatch[0]) as { items: unknown }
    if (!Array.isArray(parsed.items)) {
      throw new Error('Estructura de respuesta inválida')
    }

    return NextResponse.json({ items: parsed.items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: `Error al analizar: ${message}` }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output (cero errores).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/receipts/scan/route.ts
git commit -m "feat: add POST /api/receipts/scan route handler with Gemini 1.5 Flash"
```

---

## Task 3: Server Actions — createExpensesFromReceipt

**Files:**
- Create: `src/actions/receipts.ts`

- [ ] **Step 1: Crear `src/actions/receipts.ts`**

```typescript
'use server'

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type ScannedItem = {
  name: string
  amount: number
  category: string
  type: 'variable' | 'fixed'
}

export async function createExpensesFromReceipt(
  items: ScannedItem[],
  receiptImageUrl: string | null,
  month: string
) {
  const { familyId, userName } = await requireAuth()

  const varItems = items.filter((item) => item.type === 'variable')
  if (varItems.length === 0) return

  await prisma.expense.createMany({
    data: varItems.map((item) => ({
      familyId,
      amount: item.amount,
      category: item.category,
      description: item.name,
      spentBy: userName,
      month,
      receiptImageUrl,
    })),
  })

  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}

export async function createFixedExpensesFromReceipt(
  items: ScannedItem[],
  receiptImageUrl: string | null,
  month: string
) {
  const { familyId } = await requireAuth()

  const fixItems = items.filter((item) => item.type === 'fixed')
  if (fixItems.length === 0) return

  await prisma.fixedExpense.createMany({
    data: fixItems.map((item) => ({
      familyId,
      amount: item.amount,
      category: item.category,
      paid: false,
      month,
      receiptImageUrl,
    })),
  })

  revalidatePath('/dashboard/fixed')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output (cero errores).

- [ ] **Step 3: Commit**

```bash
git add src/actions/receipts.ts
git commit -m "feat: add createExpensesFromReceipt and createFixedExpensesFromReceipt Server Actions"
```

---

## Task 4: ReceiptUploadStep — Paso 1 del modal

**Files:**
- Create: `src/components/receipt/ReceiptUploadStep.tsx`

- [ ] **Step 1: Crear `src/components/receipt/ReceiptUploadStep.tsx`**

```typescript
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/receipt/ReceiptUploadStep.tsx
git commit -m "feat: add ReceiptUploadStep with drag & drop and thumbnail preview"
```

---

## Task 5: ReceiptProcessingStep — Paso 2 del modal

**Files:**
- Create: `src/components/receipt/ReceiptProcessingStep.tsx`

- [ ] **Step 1: Crear `src/components/receipt/ReceiptProcessingStep.tsx`**

```typescript
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/receipt/ReceiptProcessingStep.tsx
git commit -m "feat: add ReceiptProcessingStep with spinner and error state"
```

---

## Task 6: ReceiptReviewStep — Paso 3 del modal

**Files:**
- Create: `src/components/receipt/ReceiptReviewStep.tsx`

Este componente maneja la lista editable de ítems, la subida a Supabase Storage y la creación de gastos al confirmar.

- [ ] **Step 1: Crear `src/components/receipt/ReceiptReviewStep.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createExpensesFromReceipt, createFixedExpensesFromReceipt } from '@/actions/receipts'
import type { CategoryRow } from '@/types'

type ScannedItem = {
  name: string
  amount: number
  category: string
  type: 'variable' | 'fixed'
}

type Props = {
  items: ScannedItem[]
  files: File[]
  variableCategories: CategoryRow[]
  fixedCategories: CategoryRow[]
  familyId: string
  month: string
  onAddMorePhotos: () => void
  onClose: () => void
}

export function ReceiptReviewStep({
  items: initialItems,
  files,
  variableCategories,
  fixedCategories,
  familyId,
  month,
  onAddMorePhotos,
  onClose,
}: Props) {
  const [items, setItems] = useState<ScannedItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()

  function updateItem(index: number, patch: Partial<ScannedItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function categoriesFor(type: 'variable' | 'fixed'): CategoryRow[] {
    return type === 'variable' ? variableCategories : fixedCategories
  }

  async function handleConfirm() {
    startTransition(async () => {
      // Upload first image to Supabase Storage; store signed URL (1 year)
      let receiptImageUrl: string | null = null
      if (files.length > 0) {
        const supabase = createClient()
        const file = files[0]
        const path = `${familyId}/${month}-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(path, file)
        if (!uploadError) {
          const { data: signedData } = await supabase.storage
            .from('receipts')
            .createSignedUrl(path, 31_536_000) // 1 year in seconds
          receiptImageUrl = signedData?.signedUrl ?? null
        }
      }

      // Create variable expenses
      const hasVariable = items.some((i) => i.type === 'variable')
      const hasFixed = items.some((i) => i.type === 'fixed')

      if (hasVariable) {
        await createExpensesFromReceipt(items, receiptImageUrl, month)
      }
      if (hasFixed) {
        await createFixedExpensesFromReceipt(items, receiptImageUrl, month)
      }

      onClose()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No hay ítems. Podés agregar más fotos o cerrar el scanner.
        </p>
      ) : (
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-gray-50 p-3">
              {/* Name row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  placeholder="Nombre del ítem"
                  className="h-9 flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
                />
                <button
                  onClick={() => removeItem(i)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400"
                  aria-label="Eliminar ítem"
                >
                  ×
                </button>
              </div>

              {/* Amount + Category + Type row */}
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={item.amount || ''}
                  onChange={(e) =>
                    updateItem(i, { amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Monto"
                  className="h-9 w-24 rounded-xl border border-gray-200 px-3 text-sm focus:border-[#1a1a2e] focus:outline-none"
                />
                <select
                  value={item.category}
                  onChange={(e) => updateItem(i, { category: e.target.value })}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-gray-200 px-2 text-sm focus:border-[#1a1a2e] focus:outline-none"
                >
                  {categoriesFor(item.type).map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.emoji ? `${cat.emoji} ` : ''}
                      {cat.name}
                    </option>
                  ))}
                </select>
                <select
                  value={item.type}
                  onChange={(e) =>
                    updateItem(i, {
                      type: e.target.value as 'variable' | 'fixed',
                      // Reset category to first of new type
                      category:
                        e.target.value === 'variable'
                          ? (variableCategories[0]?.name ?? '')
                          : (fixedCategories[0]?.name ?? ''),
                    })
                  }
                  className="h-9 w-24 rounded-xl border border-gray-200 px-2 text-sm focus:border-[#1a1a2e] focus:outline-none"
                >
                  <option value="variable">Variable</option>
                  <option value="fixed">Fijo</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onAddMorePhotos}
          disabled={isPending}
          className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          + Foto más
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending || items.length === 0}
          className="h-11 flex-1 rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending
            ? 'Guardando...'
            : `Confirmar ${items.length} gasto${items.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/receipt/ReceiptReviewStep.tsx
git commit -m "feat: add ReceiptReviewStep with editable items, Supabase Storage upload and confirm"
```

---

## Task 7: ReceiptScannerModal + ReceiptScannerButton

**Files:**
- Create: `src/components/receipt/ReceiptScannerModal.tsx`
- Create: `src/components/receipt/ReceiptScannerButton.tsx`

- [ ] **Step 1: Crear `src/components/receipt/ReceiptScannerModal.tsx`**

```typescript
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
  familyId: string
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
  familyId,
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

  function handleAddMorePhotos() {
    // Go back to upload — keep existing files and items
    setStep('upload')
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
              files={files}
              variableCategories={variableCategories}
              fixedCategories={fixedCategories}
              familyId={familyId}
              month={month}
              onAddMorePhotos={handleAddMorePhotos}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/receipt/ReceiptScannerButton.tsx`**

Este es el "client island" — acepta props del Server Component y maneja el estado de apertura del modal.

```typescript
'use client'

import { useState } from 'react'
import { ReceiptScannerModal } from './ReceiptScannerModal'
import type { CategoryRow } from '@/types'

type Props = {
  type: 'variable' | 'fixed'
  variableCategories: CategoryRow[]
  fixedCategories: CategoryRow[]
  familyId: string
  month: string
}

export function ReceiptScannerButton({
  type,
  variableCategories,
  fixedCategories,
  familyId,
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
          familyId={familyId}
          month={month}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output.

- [ ] **Step 4: Commit**

```bash
git add src/components/receipt/ReceiptScannerModal.tsx src/components/receipt/ReceiptScannerButton.tsx
git commit -m "feat: add ReceiptScannerModal (3-step orchestrator) and ReceiptScannerButton client island"
```

---

## Task 8: Wire into expense and fixed pages

**Files:**
- Modify: `src/app/dashboard/expenses/page.tsx`
- Modify: `src/app/dashboard/fixed/page.tsx`

- [ ] **Step 1: Leer ambas páginas actuales**

Leer `src/app/dashboard/expenses/page.tsx` y `src/app/dashboard/fixed/page.tsx`.

- [ ] **Step 2: Reemplazar `src/app/dashboard/expenses/page.tsx`**

```typescript
import { requireAuth } from '@/lib/auth'
import { getExpensesByMonth } from '@/lib/db/expenses'
import { getCategoriesByFamily } from '@/lib/db/categories'
import { getMonthKey, formatMoney } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { ExpenseList } from '@/components/expenses/ExpenseList'
import { ReceiptScannerButton } from '@/components/receipt/ReceiptScannerButton'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function ExpensesPage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const [expenses, variableCategories, fixedCategories] = await Promise.all([
    getExpensesByMonth(familyId, currentMonth),
    getCategoriesByFamily(familyId, 'variable'),
    getCategoriesByFamily(familyId, 'fixed'),
  ])

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <>
      <Header title="Gastos variables" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
          <p className="text-xs text-white/60">Total del mes</p>
          <p className="font-mono text-2xl font-bold">{formatMoney(total)}</p>
          <p className="text-xs text-white/40">{expenses.length} gastos registrados</p>
        </div>

        <ReceiptScannerButton
          type="variable"
          variableCategories={variableCategories}
          fixedCategories={fixedCategories}
          familyId={familyId}
          month={currentMonth}
        />

        <ExpenseForm categories={variableCategories} />
        <ExpenseList expenses={expenses} categories={variableCategories} />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Reemplazar `src/app/dashboard/fixed/page.tsx`**

```typescript
import { requireAuth } from '@/lib/auth'
import { getFixedExpensesByMonth } from '@/lib/db/fixed-expenses'
import { getCategoriesByFamily } from '@/lib/db/categories'
import { getMonthKey, formatMoney } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { FixedExpenseForm } from '@/components/fixed/FixedExpenseForm'
import { FixedExpenseList } from '@/components/fixed/FixedExpenseList'
import { ReceiptScannerButton } from '@/components/receipt/ReceiptScannerButton'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function FixedExpensesPage({ searchParams }: Props) {
  const { familyId } = await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  const [fixedExpenses, variableCategories, fixedCategories] = await Promise.all([
    getFixedExpensesByMonth(familyId, currentMonth),
    getCategoriesByFamily(familyId, 'variable'),
    getCategoriesByFamily(familyId, 'fixed'),
  ])

  const totalPaid = fixedExpenses.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0)
  const totalPending = fixedExpenses.filter((e) => !e.paid).reduce((sum, e) => sum + e.amount, 0)

  return (
    <>
      <Header title="Gastos fijos" currentMonth={currentMonth} />

      <main className="space-y-4 px-4 py-4">
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-white/60">Pagado</p>
              <p className="font-mono text-xl font-bold text-green-400">{formatMoney(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Pendiente</p>
              <p className="font-mono text-xl font-bold text-yellow-400">{formatMoney(totalPending)}</p>
            </div>
          </div>
        </div>

        <ReceiptScannerButton
          type="fixed"
          variableCategories={variableCategories}
          fixedCategories={fixedCategories}
          familyId={familyId}
          month={currentMonth}
        />

        <FixedExpenseForm currentMonth={currentMonth} categories={fixedCategories} />
        <FixedExpenseList fixedExpenses={fixedExpenses} categories={fixedCategories} />
      </main>
    </>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: sin output (cero errores).

- [ ] **Step 5: Correr tests**

```bash
npm test
```

Expected: 7/7 pasando.

- [ ] **Step 6: Commit final**

```bash
git add src/app/dashboard/expenses/page.tsx src/app/dashboard/fixed/page.tsx
git commit -m "feat: add Escanear boleta button to expenses and fixed pages"
```

---

## Self-Review

**Spec coverage:**
- ✅ Botón "📷 Escanear boleta" en expenses y fixed pages → Task 8
- ✅ Compresión client-side con Canvas API (max 1200px, JPEG 0.75) → Task 1
- ✅ Modal de 3 pasos (upload → processing → review) → Tasks 4, 5, 6, 7
- ✅ Drag & drop en desktop, input file en mobile → Task 4
- ✅ Múltiples fotos por boleta → Task 4 (multiple file input)
- ✅ Route Handler POST /api/receipts/scan → Task 2
- ✅ Gemini 1.5 Flash extrae ítems en JSON → Task 2
- ✅ Categorías dinámicas de la familia incluidas en el prompt → Task 2
- ✅ Paso 2: spinner + error handling + botón "Volver" → Task 5
- ✅ Paso 3: campos editables (nombre, monto, categoría, tipo) → Task 6
- ✅ Badge editable Variable/Fijo en ReceiptReviewStep → Task 6
- ✅ Botón × por ítem → Task 6
- ✅ Botón "Agregar foto más" → Task 6 + 7
- ✅ Subida a Supabase Storage (primera imagen, bucket `receipts`) → Task 6
- ✅ URL firmada 1 año → Task 6
- ✅ Server Actions createExpensesFromReceipt + createFixedExpensesFromReceipt → Task 3
- ✅ receiptImageUrl guardado en Expense y FixedExpense → Task 3
- ✅ Modal bottom-sheet en mobile, card centrado en desktop → Task 7
- ✅ GEMINI_API_KEY env var → Prerequisitos manuales

**Placeholder scan:** ninguno encontrado — todo el código está escrito.

**Type consistency:**
- `ScannedItem` definido de forma idéntica en Tasks 2, 3, 6, 7 (inline type — consistent)
- `CategoryRow` importado de `@/types` en Tasks 6, 7, 8 ✅
- `createExpensesFromReceipt(items, receiptImageUrl, month)` — misma firma en Task 3 y uso en Task 6 ✅
- `ReceiptScannerModal` props: `type, variableCategories, fixedCategories, familyId, month, onClose` — consistent entre Task 7 y Task 8 ✅
