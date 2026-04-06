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
