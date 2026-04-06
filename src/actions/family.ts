'use server'

import { requireAuth } from '@/lib/auth'
import * as db from '@/lib/db/family'
import { redirect } from 'next/navigation'

export async function joinFamilyByCode(inviteCode: string) {
  const { userId, familyId: currentFamilyId } = await requireAuth()

  const family = await db.getFamilyByInviteCode(inviteCode)
  if (!family) throw new Error('Código de invitación inválido')

  // Already in this family — nothing to do
  if (currentFamilyId === family.id) redirect('/dashboard')

  await db.joinFamily(userId, family.id)

  // Update user_metadata so requireAuth() returns the new familyId immediately
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.updateUser({ data: { familyId: family.id } })

  redirect('/dashboard')
}
