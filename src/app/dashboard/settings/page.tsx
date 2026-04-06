import { requireAuth } from '@/lib/auth'
import { getCategoriesByFamily } from '@/lib/db/categories'
import { Header } from '@/components/layout/Header'
import { CategoryList } from '@/components/settings/CategoryList'
import { CategoryForm } from '@/components/settings/CategoryForm'

export default async function SettingsPage() {
  const { familyId } = await requireAuth()
  const [variableCategories, fixedCategories] = await Promise.all([
    getCategoriesByFamily(familyId, 'variable'),
    getCategoriesByFamily(familyId, 'fixed'),
  ])

  return (
    <>
      <Header title="Configuración" />

      <main className="space-y-6 px-4 py-4">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Categorías de gastos variables
          </h2>
          <CategoryList categories={variableCategories} type="variable" />
          <CategoryForm type="variable" />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Categorías de gastos fijos
          </h2>
          <CategoryList categories={fixedCategories} type="fixed" />
          <CategoryForm type="fixed" />
        </section>
      </main>
    </>
  )
}
