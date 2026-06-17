'use client'

import Link from 'next/link'
import { Users, Swords, Calendar, Trophy, CreditCard } from 'lucide-react'
import { TimeDisplay } from '@/components/TimeDisplay'
import PaymentStatusBadge from '@/app/(dashboard)/payments/PaymentStatusBadge'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface Scrim {
  id: string
  rival: string
  scheduled_at: string
  result: string | null
}

export default function PlayerDashboard() {
  const [teamName, setTeamName] = useState<string>('Sin equipo')
  const [upcomingScrims, setUpcomingScrims] = useState<Scrim[]>([])
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('*, teams(name, slug)')
        .eq('status', 'active')
        .limit(1)

      const team = teamMembers?.[0]
      const teamId = team?.team_id
      setTeamName(team?.teams?.name ?? 'Sin equipo')

      if (teamId) {
        supabase
          .from('scrims')
          .select('*')
          .eq('team_id', teamId)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at')
          .limit(5)
          .then(({ data }) => setUpcomingScrims(data ?? []))
      }

      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      if (activeSeason) {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('season_id', activeSeason.id)
          .maybeSingle()
        if (payment) setPaymentStatus(payment.status)
      }
    })()
  }, [])

  const stats = [
    { label: 'Equipo', value: teamName, icon: Users, color: 'text-purple-400', href: '/players/team' },
    { label: 'Próximos scrims', value: upcomingScrims.length, icon: Swords, color: 'text-green-400', href: '/players/scrims' },
  ]

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="glass glass-hover rounded-xl p-5">
            <div className="flex items-center justify-between">
              <s.icon size={24} className={s.color} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
          </Link>
        ))}
        <Link href="/payments" className="glass glass-hover rounded-xl p-5">
          <div className="flex items-center justify-between">
            <CreditCard size={24} className={paymentStatus === 'paid' ? 'text-green-400' : paymentStatus === 'scholarship' ? 'text-blue-400' : 'text-yellow-400'} />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {paymentStatus ? (
              <PaymentStatusBadge status={paymentStatus} />
            ) : (
              <span className="text-xs text-zinc-600">Sin registro</span>
            )}
          </p>
          <p className="mt-1 text-sm text-zinc-400">Mi pago</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Próximos scrims</h2>
            <Link href="/players/scrims" className="text-xs text-[#8B5CF6] hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {upcomingScrims.length === 0 && (
              <p className="text-sm text-zinc-500">No hay scrims programados.</p>
            )}
            {upcomingScrims.map((scrim) => (
              <div key={scrim.id} className="glass flex items-center gap-3 rounded-lg px-4 py-3">
                <Swords size={16} className="text-green-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{scrim.rival}</p>
                  <p className="text-xs text-zinc-500"><TimeDisplay date={scrim.scheduled_at} /></p>
                </div>
                <span className={`text-xs ${scrim.result === 'win' ? 'text-green-400' : scrim.result === 'loss' ? 'text-red-400' : 'text-zinc-500'}`}>
                  {scrim.result ?? 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h2 className="mb-4 font-heading text-lg font-bold text-white">Acceso rápido</h2>
          <div className="space-y-2">
            <Link href="/players/team" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <Users size={16} className="text-purple-400" />
              Mi equipo
            </Link>
            <Link href="/players/schedule" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <Calendar size={16} className="text-blue-400" />
              Horario competitivo
            </Link>
            <Link href="/players/scrims" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <Swords size={16} className="text-green-400" />
              Historial de scrims
            </Link>
            <Link href="/players/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <Trophy size={16} className="text-yellow-400" />
              Mi perfil
            </Link>
            <Link href="/payments" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <CreditCard size={16} className="text-blue-400" />
              Mis pagos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
