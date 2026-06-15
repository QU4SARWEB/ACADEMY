'use client'

import { useState } from 'react'
import { updatePayment } from '@/features/payments/actions'
import { useRouter } from 'next/navigation'

const ACTIONS: Array<{ label: string; status: string; color: string }> = [
  { label: 'Marcar pagado', status: 'paid', color: 'text-green-400 hover:bg-green-500/10' },
  { label: 'Beca', status: 'scholarship', color: 'text-blue-400 hover:bg-blue-500/10' },
  { label: 'Vencido', status: 'expired', color: 'text-red-400 hover:bg-red-500/10' },
  { label: 'Pendiente', status: 'pending', color: 'text-yellow-400 hover:bg-yellow-500/10' },
]

export default function PaymentActions({ paymentId, currentStatus }: { paymentId: string; currentStatus: string }) {
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  async function handleClick(status: string) {
    if (status === currentStatus) return
    setUpdating(true)
    await updatePayment(paymentId, status as any)
    setUpdating(false)
    router.refresh()
  }

  return (
    <div className="flex gap-1">
      {ACTIONS.map((a) => (
        <button
          key={a.status}
          onClick={() => handleClick(a.status)}
          disabled={updating || a.status === currentStatus}
          className={`rounded px-2 py-1 text-xs transition disabled:opacity-30 ${
            a.status === currentStatus ? 'text-zinc-600' : a.color
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
