import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { seedDefaultCategories } from '@/lib/db/categories'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const existingUser = await prisma.user.findUnique({ where: { id: user.id } })

  if (!existingUser) {
    // Primera vez: determinar a qué familia unir
    let familyId: string

    if (inviteCode) {
      const inviteFamily = await prisma.family.findUnique({ where: { inviteCode } })
      if (inviteFamily) {
        familyId = inviteFamily.id
      } else {
        // Código inválido → crear familia propia
        const newFamily = await prisma.family.create({ data: {} })
        familyId = newFamily.id
      }
    } else {
      const newFamily = await prisma.family.create({ data: {} })
      familyId = newFamily.id
    }

    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: (user.user_metadata.full_name as string) ?? null,
        avatarUrl: (user.user_metadata.avatar_url as string) ?? null,
        familyId,
      },
    })

    await supabase.auth.updateUser({ data: { familyId } })
    await seedDefaultCategories(familyId)
  } else if (!user.user_metadata?.familyId && existingUser.familyId) {
    // Edge case: familyId en Prisma pero no en metadata
    await supabase.auth.updateUser({ data: { familyId: existingUser.familyId } })
  }
  // Note: existing authenticated users who want to join via invite use the
  // joinFamilyByCode Server Action from /invite/[code] page directly

  return NextResponse.redirect(`${origin}/dashboard`)
}
