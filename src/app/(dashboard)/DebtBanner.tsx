'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebtBanner() {
  const [hasDebt, setHasDebt] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return
      supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .in('status', ['pending', 'expired'])
        .then(({ count, error }) => {
          if (!error) setHasDebt((count ?? 0) > 0)
        })
    })
  }, [])

  if (!hasDebt) return null

  return (
    <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-6 py-2 text-center text-sm text-yellow-400">
      Tienes pagos pendientes. Sube tu comprobante de pago para reactivar tu acceso.{' '}
      <a href="/payments" className="underline font-medium hover:text-yellow-300">
        Ir a pagos
      </a>
    </div>
  )
}
