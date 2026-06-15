import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Swords, Calendar, Trophy, ArrowRight } from 'lucide-react'

export default async function PlayerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*, teams(name, slug)')
    .eq('profile_id', user.id)
    .eq('status', 'active')

  const teamId = teamMembers?.[0]?.team_id

  const { data: upcomingScrims } = await supabase
    .from('scrims')
    .select('*')
    .eq('team_id', teamId ?? 'none')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(5)

  const stats = [
    { label: 'Equipo', value: teamMembers?.[0]?.teams?.name ?? 'Sin equipo', icon: Users, color: 'text-purple-400', href: '/players/team' },
    { label: 'Próximos scrims', value: upcomingScrims?.length ?? 0, icon: Swords, color: 'text-green-400', href: '/players/scrims' },
  ]

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="glass glass-hover rounded-xl p-5">
            <div className="flex items-center justify-between">
              <s.icon size={24} className={s.color} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Próximos scrims</h2>
            <Link href="/players/scrims" className="text-xs text-[#8B5CF6] hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {(upcomingScrims ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">No hay scrims programados.</p>
            )}
            {(upcomingScrims ?? []).map((scrim) => (
              <div key={scrim.id} className="glass flex items-center gap-3 rounded-lg px-4 py-3">
                <Swords size={16} className="text-green-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{scrim.rival}</p>
                  <p className="text-xs text-zinc-500">{new Date(scrim.scheduled_at).toLocaleString()}</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
