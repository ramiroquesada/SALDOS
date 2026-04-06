'use client'

import { useState } from 'react'

type Props = {
  inviteCode: string
  appUrl: string
  memberCount: number
}

export function InviteCard({ inviteCode, appUrl, memberCount }: Props) {
  const [copied, setCopied] = useState(false)
  const link = `${appUrl}/invite/${inviteCode}`

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (memberCount >= 2) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">👫 Pareja conectada</p>
        <p className="text-xs text-gray-400 mt-1">Tu pareja ya está en la app.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700">Invitá a tu pareja</p>
      <p className="text-xs text-gray-400 mt-1 mb-3">
        Compartí este link para que acceda a los datos de la familia.
      </p>
      <button
        onClick={handleCopy}
        className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-left active:bg-gray-100"
      >
        <span className="truncate text-xs text-gray-500">{link}</span>
        <span className="ml-2 flex-shrink-0 text-sm font-semibold text-[#1a1a2e]">
          {copied ? '✓ Copiado' : 'Copiar'}
        </span>
      </button>
    </div>
  )
}
