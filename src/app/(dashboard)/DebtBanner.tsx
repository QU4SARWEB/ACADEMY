import { createClient } from '@/lib/supabase/server'
import { hasDebt } from '@/services/payments'

export default async function DebtBanner({ userId, role }: { userId: string; role: string }) {
  if (role === 'coach') return null

  const supabase = await createClient()
  const debt = await hasDebt(supabase, userId)

  if (!debt) return null

  return (
    <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-6 py-2 text-center text-sm text-yellow-400">
      Tienes pagos pendientes.{' '}
      <a href="/payments" className="underline hover:text-yellow-300">
        Ver pagos
      </a>
    </div>
  )
}
