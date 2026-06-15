import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Users, Plus } from 'lucide-react'

async function createTeam(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const seasonId = formData.get('seasonId') as string

  const { data: team } = await supabase.from('teams').insert({
    name: formData.get('name') as string,
    season_id: seasonId || null,
  }).select('id').single()

  if (team) {
    const profileId = formData.get('profileId') as string
    if (profileId) {
      await supabase.from('team_members').insert({
        team_id: team.id,
        profile_id: profileId,
        role: 'captain',
        status: 'active',
      })
    }
  }

  revalidatePath('/coaches/teams')
  redirect('/coaches/teams')
}

async function addMember(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('team_members').insert({
    team_id: formData.get('teamId') as string,
    profile_id: formData.get('profileId') as string,
    role: formData.get('role') as string || 'player',
    status: 'active',
  })
  revalidatePath('/coaches/teams')
}

async function removeMember(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('team_members').delete().eq('id', formData.get('memberId') as string)
  revalidatePath('/coaches/teams')
}

async function updateMemberRole(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const memberId = formData.get('memberId') as string
  const role = formData.get('role') as string
  await supabase.from('team_members').update({ role }).eq('id', memberId)
  revalidatePath('/coaches/teams')
}

export default async function CoachTeamsPage() {
  const supabase = await createClient()

  const { data: teams } = await supabase.from('teams').select('*, seasons(name)').order('name')
  const { data: players } = await supabase.from('profiles').select('id, full_name').eq('role', 'player').order('full_name')
  const { data: seasons } = await supabase.from('seasons').select('id, name, is_active')

  const teamIds = (teams ?? []).map((t) => t.id)
  const { data: allMembers } = await supabase
    .from('team_members')
    .select('*, profiles(full_name, avatar_url, riot_id, rank)')
    .in('team_id', teamIds.length > 0 ? teamIds : ['none'])
    .order('role')

  const membersByTeam: Record<string, typeof allMembers> = {}
  for (const m of allMembers ?? []) {
    if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
    membersByTeam[m.team_id]!.push(m)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Equipos</h1>
        <details className="relative">
          <summary className="btn-glow flex cursor-pointer items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            <Plus size={16} /> Nuevo equipo
          </summary>
          <div className="glass absolute right-0 top-full z-10 mt-2 w-80 rounded-xl p-4">
            <form action={createTeam} className="space-y-3">
              <input name="name" placeholder="Nombre del equipo" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              <select name="seasonId"
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Sin season</option>
                {(seasons ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select name="profileId"
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Sin capitán</option>
                {(players ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <button type="submit" className="w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                Crear equipo
              </button>
            </form>
          </div>
        </details>
      </div>

      <div className="space-y-4">
        {(teams ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay equipos creados.</p>
        )}
        {(teams ?? []).map((team) => {
          const members = membersByTeam[team.id] ?? []
          return (
            <div key={team.id} className="glass rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold text-white">{team.name}</h2>
                  <p className="text-sm text-zinc-500">{team.seasons?.name} · {members.length} miembros</p>
                </div>
              </div>

              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">
                        {m.profiles?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{m.profiles?.full_name}</p>
                        <p className="text-xs text-zinc-500">
                          {m.role === 'captain' ? 'Capitán' : m.role === 'coach' ? 'Coach' : 'Jugador'}
                          {m.profiles?.rank ? ` · ${m.profiles.rank}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.role !== 'captain' && (
                        <form action={updateMemberRole}>
                          <input type="hidden" name="memberId" value={m.id} />
                          <input type="hidden" name="role" value="captain" />
                          <button type="submit" className="text-xs text-yellow-400 hover:text-yellow-300">Hacer capitán</button>
                        </form>
                      )}
                      <form action={removeMember}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <button type="submit" className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-[#8B5CF6] hover:underline">Añadir miembro</summary>
                <form action={addMember} className="mt-2 flex gap-2">
                  <input type="hidden" name="teamId" value={team.id} />
                  <select name="profileId" required
                    className="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    <option value="">Seleccionar jugador...</option>
                    {(players ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                  <select name="role"
                    className="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    <option value="player">Jugador</option>
                    <option value="captain">Capitán</option>
                    <option value="coach">Coach</option>
                  </select>
                  <button type="submit" className="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs text-white transition hover:bg-[#7C3AED]">
                    Añadir
                  </button>
                </form>
              </details>
            </div>
          )
        })}
      </div>
    </div>
  )
}
