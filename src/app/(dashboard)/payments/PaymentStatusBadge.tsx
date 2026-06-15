'use client'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400',
  paid: 'bg-green-500/10 text-green-400',
  scholarship: 'bg-blue-500/10 text-blue-400',
  expired: 'bg-red-500/10 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  scholarship: 'Beca',
  expired: 'Vencido',
}

export default function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
