import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AuthContext = {
  userId: string
  familyId: string
  userName: string
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const familyId = user.user_metadata?.familyId as string | undefined
  if (!familyId) redirect('/auth/login')

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Vos'

  return { userId: user.id, familyId, userName }
}
