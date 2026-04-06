# Scanner de Boletas + Categorías Dinámicas + Editar Gastos — Design Document

**Fecha:** 2026-04-05  
**Estado:** Aprobado

---

## Resumen

Tres features complementarias que se construyen juntas:

1. **Scanner de boletas** — subís una o varias fotos de una boleta/factura, Gemini 1.5 Flash extrae cada ítem con monto y categoría sugerida, el usuario revisa y confirma. La foto queda guardada como respaldo en cada gasto.
2. **Categorías dinámicas** — las familias pueden crear sus propias categorías (variables y fijas) desde una página de configuración. Toda la app las consume dinámicamente.
3. **Editar gastos** — los ítems de gastos variables y fijos son editables inline desde el historial.

Estas tres features se desarrollan en la misma fase porque comparten la misma UI de edición y el mismo modelo de categorías.

---

## Fases de desarrollo (esta fase)

| Feature | Páginas afectadas |
|---------|------------------|
| Scanner de boletas (modal 3 pasos + Gemini) | `/dashboard/expenses`, `/dashboard/fixed` |
| Compresión client-side + Supabase Storage | client-side + Route Handler |
| Visor de boleta en historial (📷 lightbox) | `ExpenseList`, `FixedExpenseList` |
| Editar gastos inline (✏️) | `ExpenseList`, `FixedExpenseList` |
| Categorías dinámicas | `/dashboard/settings` + toda la app |

---

## Arquitectura

```
[Modal 3 pasos — cliente]
    │
    │ 1. Canvas compress images (client-side)
    │ 2. FormData → POST /api/receipts/scan
    ▼
[Route Handler: /api/receipts/scan]
    │ convierte imágenes a base64
    │ llama Gemini 1.5 Flash API
    ▼
[Gemini 1.5 Flash]
    │ retorna JSON estructurado
    ▼
[Review screen — cliente edita ítems]
    │ usuario confirma
    │ 3. sube imágenes a Supabase Storage
    │ 4. llama Server Action createExpensesFromReceipt
    ▼
[Expense / FixedExpense en PostgreSQL con receiptImageUrl]
```

**Decisiones clave:**
- Route Handler (no Server Action) para la llamada a Gemini — los Server Actions no manejan bien archivos grandes
- Imágenes comprimidas en el cliente antes de enviar (Canvas API, sin librerías externas) — de 3-5MB a ~200-300KB
- Supabase Storage solo recibe imágenes si el usuario confirma — si cancela no se guarda nada
- Categorías: los selects leen de la DB (`Category` model) en vez de constantes hardcodeadas. Las categorías default se marcan con `isDefault: true` y no se pueden eliminar.

---

## Modelo de datos

### Cambios en modelos existentes

```prisma
model Expense {
  // ...campos actuales sin cambios...
  receiptImageUrl String?   // URL pública firmada en Supabase Storage; null si fue cargado manualmente
}

model FixedExpense {
  // ...campos actuales sin cambios...
  receiptImageUrl String?
}
```

### Modelo nuevo

```prisma
model Category {
  id        String  @id @default(uuid())
  name      String
  emoji     String?
  type      String  // "variable" | "fixed"
  familyId  String
  family    Family  @relation(fields: [familyId], references: [id])
  isDefault Boolean @default(false)  // las categorías built-in no se pueden eliminar

  @@unique([familyId, name, type])
  @@index([familyId, type])
}

// Agregar a Family:
model Family {
  // ...campos actuales...
  categories Category[]
}
```

### Supabase Storage

- **Bucket:** `receipts` (privado, acceso solo con token de sesión)
- **Path:** `{familyId}/{YYYY-MM}-{timestamp}.jpg`
- **URL:** firmada con expiración de 1 año al momento de guardar — se almacena la URL firmada directamente en `receiptImageUrl`

---

## Variables de entorno nuevas

```env
GEMINI_API_KEY=<clave de Google AI Studio>
```

---

## Seeding de categorías default

En la primera vez que una familia accede a la app (o cuando se detecta que no tiene categorías), se ejecuta un seed que crea las categorías default con `isDefault: true`:

**Variables:** Supermercado, Farmacia, Transporte, Comida afuera, Ropa, Bebé, Salud, Hogar, Ocio, Otro  
**Fijas:** Alquiler, UTE (Luz), OSE (Agua), Internet, Celular, Seguro, Mutualista, Otro

El seed se ejecuta en `src/app/auth/callback/route.ts` inmediatamente después de crear la nueva `Family` — una sola vez por familia.

---

## Feature 1: Scanner de boletas

### Punto de entrada

Botón **"📷 Escanear boleta"** en:
- `src/app/dashboard/expenses/page.tsx` — arriba del formulario de gastos variables
- `src/app/dashboard/fixed/page.tsx` — arriba del formulario de gastos fijos

El botón abre `ReceiptScannerModal` con el `type` correspondiente (`"variable"` o `"fixed"`).

### Componentes

```
src/components/receipt/
├── ReceiptScannerModal.tsx      # Wrapper del modal, maneja el estado de los 3 pasos
├── ReceiptUploadStep.tsx        # Paso 1: subir fotos (drag & drop + input file)
├── ReceiptProcessingStep.tsx    # Paso 2: spinner mientras Gemini procesa
├── ReceiptReviewStep.tsx        # Paso 3: lista editable de ítems extraídos
├── ReceiptImageViewer.tsx       # Lightbox para ver la foto desde el historial
└── compressImage.ts             # Utilidad: Canvas API, redimensiona a max 1200px, JPEG 0.75
```

### Paso 1 — Subir fotos (`ReceiptUploadStep`)

- Área de drag & drop en desktop con borde punteado
- `<input type="file" accept="image/*" multiple>` — en mobile el browser ofrece cámara o galería
- Thumbnails de preview con botón × para eliminar cada foto antes de procesar
- Botón **"Analizar boleta"** — deshabilitado si no hay fotos, activa el paso 2
- Compresión se ejecuta al seleccionar los archivos (antes de mostrar thumbnails)

### Paso 2 — Procesando (`ReceiptProcessingStep`)

- Spinner animado con texto "Analizando boleta..."
- Si el Route Handler devuelve error (imagen ilegible, API caída, JSON malformado): muestra mensaje de error y botón "Volver" al paso 1
- Timeout de 30 segundos — si Gemini no responde, error manejado

### Paso 3 — Revisar y confirmar (`ReceiptReviewStep`)

Lista de ítems extraídos, cada uno con:
- **Nombre** — input de texto editable
- **Monto** — input numérico editable
- **Categoría** — select con todas las categorías de la familia (variables o fijas según el `type` del modal)
- **Tipo** — badge editable "Variable" / "Fijo" (útil si Gemini se equivocó)
- **Botón ×** — elimina el ítem de la lista

Footer con:
- **"Agregar foto más"** — vuelve al paso 1 para agregar más imágenes (útil para boletas largas)
- **"Confirmar X gastos"** — guarda todo, sube imágenes, cierra modal

### Route Handler: `POST /api/receipts/scan`

```
src/app/api/receipts/scan/route.ts
```

1. Recibe `FormData` con `images[]` y `type` (`"variable"` | `"fixed"`)
2. Valida auth con Supabase server client
3. Lee las categorías de la familia desde Prisma (para incluirlas en el prompt)
4. Convierte imágenes a base64
5. Llama `@google/generative-ai` con Gemini 1.5 Flash
6. Parsea la respuesta JSON
7. Retorna `{ items: [{ name, amount, category, type }] }`

### Prompt a Gemini

```
Sos un asistente que extrae ítems de boletas y facturas.
Analizá la/s imagen/s y devolvé ÚNICAMENTE un JSON con todos 
los ítems individuales. No incluyas subtotales ni totales generales.
Si un monto no es legible, usá 0.

Categorías disponibles para gastos variables: [lista dinámica de la familia]
Categorías disponibles para gastos fijos: [lista dinámica de la familia]

Formato de respuesta (solo JSON válido, sin texto adicional):
{
  "items": [
    {
      "name": "nombre del ítem",
      "amount": 123.45,
      "category": "categoría exacta de la lista",
      "type": "variable" | "fixed"
    }
  ]
}
```

### Server Actions nuevas

```
src/actions/receipts.ts
├── createExpensesFromReceipt(items, imageUrl, month)   → crea Expense[]
└── createFixedExpensesFromReceipt(items, imageUrl, month) → crea FixedExpense[]
```

Ambas usan `requireAuth()` para obtener `familyId`. El `imageUrl` es la URL firmada de Supabase Storage, ya subida desde el cliente.

### Visor de boleta en el historial

- En `ExpenseList` y `FixedExpenseList`, los ítems con `receiptImageUrl` muestran un ícono 📷 pequeño junto al monto
- Click/tap abre `ReceiptImageViewer` — overlay con `position: fixed`, imagen a pantalla completa con `object-contain`, botón × para cerrar
- Implementado con `<dialog>` nativo del browser (sin librerías)
- Funciona en mobile y desktop

---

## Feature 2: Categorías dinámicas

### Página `/dashboard/settings`

```
src/app/dashboard/settings/page.tsx
```

Accesible desde un ícono ⚙️ en el **Header** (esquina superior derecha) — no ocupa un tab del BottomNav, que ya tiene 6 tabs con las secciones principales.

**Secciones:**
1. **Categorías de gastos variables** — lista de categorías con emoji + nombre. Las default tienen 🔒. Botón ➕ con formulario inline para agregar nueva (nombre + emoji opcional).
2. **Categorías de gastos fijos** — ídem.

### Componentes

```
src/components/settings/
├── CategoryList.tsx        # Lista de categorías con opción eliminar (no-default)
└── CategoryForm.tsx        # Formulario inline: nombre + emoji + botón Agregar
```

### DB layer + Server Actions

```
src/lib/db/categories.ts
├── getCategoriesByFamily(familyId, type)
├── createCategory(familyId, name, emoji, type)
├── deleteCategory(id, familyId)           # solo si !isDefault
└── seedDefaultCategories(familyId)        # llamada una vez al crear familia

src/actions/categories.ts
├── addCategory(name, emoji, type)
└── removeCategory(id)
```

### Propagación a toda la app

Todos los selects de categoría en la app pasan a usar `getCategoriesByFamily()`:
- `ExpenseForm.tsx` — categorías variables
- `FixedExpenseForm.tsx` — categorías fijas
- `ReceiptReviewStep.tsx` — ambas
- `BudgetList.tsx` — categorías variables (para presupuesto)
- `BudgetPage` — ya usa `VARIABLE_CATEGORIES`; pasa a usar categorías de la DB

Las constantes `VARIABLE_CATEGORIES` y `FIXED_CATEGORIES` en `constants.ts` quedan como referencia para el seed inicial, pero los componentes dejan de importarlas directamente.

---

## Feature 3: Editar gastos

### UX

En `ExpenseList` y `FixedExpenseList`, cada ítem tiene un botón ✏️ además del existente ×. Al tocarlo:

- La fila se expande a un formulario inline (mismo patrón que `BudgetList` — sin modal)
- Campos editables: **monto**, **categoría**, **descripción/nombre**, **fecha** (solo en variables)
- Botones **Guardar** y **Cancelar**
- `useTransition` por fila (igual que en `FixedExpenseList` actual)

### Server Actions

```
src/actions/expenses.ts        → agregar updateExpense(id, data)
src/actions/fixed-expenses.ts  → agregar updateFixedExpense(id, data)
```

### Tipos nuevos

```typescript
export type UpdateExpenseInput = {
  amount?: number
  category?: string
  description?: string
  date?: string
}

export type UpdateFixedExpenseInput = {
  amount?: number
  category?: string
}
```

---

## Mapa completo de archivos

**Nuevos:**

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/api/receipts/scan/route.ts` | Route Handler: recibe imágenes, llama Gemini, retorna JSON |
| `src/lib/db/categories.ts` | Queries Prisma para categorías |
| `src/actions/receipts.ts` | createExpensesFromReceipt, createFixedExpensesFromReceipt |
| `src/actions/categories.ts` | addCategory, removeCategory |
| `src/components/receipt/ReceiptScannerModal.tsx` | Modal wrapper con estado de 3 pasos |
| `src/components/receipt/ReceiptUploadStep.tsx` | Paso 1: subir fotos |
| `src/components/receipt/ReceiptProcessingStep.tsx` | Paso 2: spinner |
| `src/components/receipt/ReceiptReviewStep.tsx` | Paso 3: lista editable |
| `src/components/receipt/ReceiptImageViewer.tsx` | Lightbox para ver boleta |
| `src/components/receipt/compressImage.ts` | Canvas compress utility |
| `src/components/settings/CategoryList.tsx` | Lista de categorías con delete |
| `src/components/settings/CategoryForm.tsx` | Formulario inline agregar categoría |
| `src/app/dashboard/settings/page.tsx` | Página de configuración |

**Modificados:**

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | + `receiptImageUrl` en Expense y FixedExpense; + modelo Category |
| `src/types/index.ts` | + tipos Category, UpdateExpenseInput, UpdateFixedExpenseInput |
| `src/app/dashboard/expenses/page.tsx` | + botón "Escanear boleta" |
| `src/app/dashboard/fixed/page.tsx` | + botón "Escanear boleta" |
| `src/components/expenses/ExpenseList.tsx` | + botón ✏️ editar + ícono 📷 |
| `src/components/fixed/FixedExpenseList.tsx` | + botón ✏️ editar + ícono 📷 |
| `src/actions/expenses.ts` | + updateExpense |
| `src/actions/fixed-expenses.ts` | + updateFixedExpense |
| `src/lib/db/expenses.ts` | + updateExpense query |
| `src/lib/db/fixed-expenses.ts` | + updateFixedExpense query |
| `src/components/layout/Header.tsx` | + ícono ⚙️ link a /dashboard/settings |
| `src/app/auth/callback/route.ts` | + seedDefaultCategories al crear nueva familia |

---

## Variables de entorno adicionales

```env
GEMINI_API_KEY=<clave de Google AI Studio>
```

---

## Consideraciones de diseño responsive

- **Modal del scanner:** en mobile ocupa pantalla completa (`fixed inset-0`); en desktop es un modal centrado de max 640px de ancho
- **Drag & drop:** visible en desktop; en mobile solo se muestra el botón de seleccionar archivos (drag & drop es inútil en touch)
- **Botones ✏️ y 📷:** en mobile son touch targets de 44px mínimo; en desktop son más compactos
- **Settings page:** misma página sirve mobile y desktop (lista simple)

---

## Dependencias nuevas

```bash
npm install @google/generative-ai
```

Solo esta. La compresión de imágenes usa Canvas API nativa del browser.
