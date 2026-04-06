import { createClient } from '@/lib/supabase/server'
import { getFamilyByInviteCode } from '@/lib/db/family'
import { JoinWithGoogleButton } from '@/components/invite/JoinWithGoogleButton'
import { JoinFamilyButton } from '@/components/invite/JoinFamilyButton'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ code: string }> }

export default async function InvitePage({ params }: Props) {
  const { code } = await params

  const family = await getFamilyByInviteCode(code)
  if (!family) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a2e] px-6">
        <div className="rounded-2xl bg-white p-6 text-center">
          <p className="text-2xl">❌</p>
          <p className="mt-2 font-semibold text-gray-800">Invitación inválida</p>
          <p className="mt-1 text-sm text-gray-500">Este link ya no es válido.</p>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const memberNames = family.members.map((m) => m.name ?? 'Usuario').join(' y ')
  const currentUserAlreadyInFamily = user && family.members.some((m) => m.id === user.id)

  if (currentUserAlreadyInFamily) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#1a1a2e] px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl">💰</div>
          <h1 className="mt-4 text-2xl font-bold text-white">Nuestras Finanzas</h1>
          <p className="mt-2 text-sm text-gray-400">Te invitaron a compartir las finanzas</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Familia de</p>
            <p className="mt-1 font-semibold text-gray-800">{memberNames}</p>
          </div>

          {user ? (
            <JoinFamilyButton inviteCode={code} />
          ) : (
            <JoinWithGoogleButton inviteCode={code} />
          )}
        </div>
      </div>
    </main>
  )
}
