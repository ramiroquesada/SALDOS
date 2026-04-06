'use client'

import { useTransition } from 'react'
import { joinFamilyByCode } from '@/actions/family'
import { Button } from '@/components/ui/Button'

type Props = { inviteCode: string }

export function JoinFamilyButton({ inviteCode }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleJoin() {
    startTransition(() => joinFamilyByCode(inviteCode))
  }

  return (
    <Button size="lg" loading={isPending} onClick={handleJoin}>
      Unirse a esta familia
    </Button>
  )
}
