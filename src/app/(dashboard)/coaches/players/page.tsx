import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PaymentStatusBadge from '@/app/(dashboard)/payments/PaymentStatusBadge'
import { formatDate } from '@/lib/formatDate'

export default async function PlayersPage() {
  const supabase = await createClient()

  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const { data: players } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, riot_id, rank, is_active, scholarship, created_at')
    .eq('role', 'player')
    .order('full_name')

  const paymentMap = new Map<string, string>()
  if (activeSeason && players) {
    const { data: payments } = await supabase
      .from('payments')
      .select('profile_id, status')
      .eq('season_id', activeSeason.id)
      .in('profile_id', players.map(p => p.id))
    for (const pm of payments ?? []) {
      paymentMap.set(pm.profile_id, pm.status)
    }
  }

  return (
    <div>
      <Link href="/coaches/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Jugadores</h1>
        <p className="mt-1 text-sm text-zinc-400">{players?.length ?? 0} jugadores registrados</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#111]">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Riot ID</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Rango</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Beca</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Pago</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Activo</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Registro</th>
            </tr>
          </thead>
          <tbody>
            {(players ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">Sin jugadores registrados.</td>
              </tr>
            )}
            {(players ?? []).map((p) => (
              <tr key={p.id} className="border-b border-zinc-800 transition hover:bg-[#111]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        p.full_name.charAt(0)
                      )}
                    </div>
                    <span className="font-medium text-white">{p.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.email}</td>
                <td className="px-4 py-3 text-zinc-400">{p.riot_id ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{p.rank}</td>
                <td className="px-4 py-3 text-center">
                  {p.scholarship ? <span className="text-green-400">Sí</span> : <span className="text-zinc-500">No</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {paymentMap.has(p.id) ? (
                    <PaymentStatusBadge status={paymentMap.get(p.id)!} />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${p.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {formatDate(p.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
