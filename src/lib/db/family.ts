import { prisma } from '@/lib/prisma'

export async function getFamilyInviteInfo(familyId: string) {
  return prisma.family.findUnique({
    where: { id: familyId },
    select: { inviteCode: true, name: true, members: { select: { id: true, name: true } } },
  })
}

export async function getFamilyByInviteCode(inviteCode: string) {
  return prisma.family.findUnique({
    where: { inviteCode },
    select: { id: true, name: true, members: { select: { id: true, name: true } } },
  })
}

export async function joinFamily(userId: string, familyId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { familyId },
  })
}
