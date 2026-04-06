'use server'

import { createClient } from '@/lib/supabase/server'
import * as db from '@/lib/db/family'
import { redirect } from 'next/navigation'

export async function joinFamilyByCode(inviteCode: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const family = await db.getFamilyByInviteCode(inviteCode)
  if (!family) throw new Error('Código de invitación inválido')

  await db.joinFamily(user.id, family.id)
  await supabase.auth.updateUser({ data: { familyId: family.id } })

  redirect('/dashboard')
}
