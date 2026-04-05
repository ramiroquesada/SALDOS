import { requireAuth } from '@/lib/auth'
import { getMonthKey } from '@/lib/utils'
import { Header } from '@/components/layout/Header'

type Props = {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  await requireAuth()
  const { month } = await searchParams
  const currentMonth = month ?? getMonthKey()

  return (
    <>
      <Header title="Nuestras Finanzas" currentMonth={currentMonth} />
      <main className="px-4 py-6">
        <p className="text-center text-sm text-gray-400">
          Dashboard — próximamente en Fase 2 🚧
        </p>
      </main>
    </>
  )
}
