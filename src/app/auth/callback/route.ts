import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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

  // Sincronizar usuario con Prisma
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  if (!existingUser) {
    // Primera vez: crear familia + usuario
    const family = await prisma.family.create({ data: {} })

    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: (user.user_metadata.full_name as string) ?? null,
        avatarUrl: (user.user_metadata.avatar_url as string) ?? null,
        familyId: family.id,
      },
    })

    // Guardar familyId en user_metadata para evitar DB query en cada request
    await supabase.auth.updateUser({
      data: { familyId: family.id },
    })
  } else if (!user.user_metadata?.familyId && existingUser.familyId) {
    // El familyId existe en Prisma pero no en metadata (edge case)
    await supabase.auth.updateUser({
      data: { familyId: existingUser.familyId },
    })
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
