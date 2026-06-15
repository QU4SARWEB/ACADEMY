import { createClient } from '@/lib/supabase/server'
import { Users, Swords } from 'lucide-react'

export default async function PlayerTeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*, teams(name, slug, created_at)')
    .eq('profile_id', user.id)
    .eq('status', 'active')

  const team = teamMembers?.[0]?.teams

  const { data: members } = await supabase
    .from('team_members')
    .select('*, profiles(full_name, avatar_url, riot_id, rank)')
    .eq('team_id', teamMembers?.[0]?.team_id ?? 'none')
    .eq('status', 'active')
    .order('role')

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Mi equipo</h1>

      {!team ? (
        <div className="glass rounded-xl p-8 text-center">
          <Users size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No estás asignado a ningún equipo todavía.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-5">
            <h2 className="font-heading text-xl font-bold text-white">{team.name}</h2>
            <p className="text-sm text-zinc-400">{members?.length ?? 0} miembros</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg font-bold text-white">Miembros</h3>
            {(members ?? []).map((m) => (
              <div key={m.id} className="glass flex items-center gap-4 rounded-xl px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6]">
                  {m.profiles?.avatar_url ? (
                    <img src={m.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    m.profiles?.full_name?.charAt(0)?.toUpperCase() ?? '?'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {m.profiles?.full_name}
                    {m.profile_id === user.id && <span className="ml-2 text-xs text-[#8B5CF6]">(Tú)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {m.role === 'captain' ? 'Capitán' : m.role === 'coach' ? 'Coach' : 'Jugador'}
                    {m.profiles?.rank ? ` · ${m.profiles.rank}` : ''}
                    {m.profiles?.riot_id ? ` · ${m.profiles.riot_id}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
