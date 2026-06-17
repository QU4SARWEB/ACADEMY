'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { toSlug } from '@/lib/slug'

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const seasonId = formData.get('seasonId') as string
  const profileId = formData.get('profileId') as string

  const slug = toSlug(name)
  if (!slug) return

  const { data: team } = await supabase.from('teams').insert({
    name,
    slug,
    season_id: seasonId || null,
  }).select('id').maybeSingle()

  if (!team) return
  await supabase.from('team_members').insert({
    team_id: team.id,
    profile_id: profileId,
    season_id: seasonId || null,
    role: 'captain',
    status: 'active',
  })

  revalidatePath('/coaches/teams')
  redirect('/coaches/teams')
}

export async function addMember(formData: FormData) {
  const supabase = await createClient()
  const teamId = formData.get('teamId') as string
  const profileId = formData.get('profileId') as string
  const role = formData.get('role') as string || 'player'

  if (!teamId || !profileId) return

  const { data: team } = await supabase
    .from('teams')
    .select('season_id')
    .eq('id', teamId)
    .maybeSingle()

  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) return

  const { error } = await supabase.from('team_members').insert({
    team_id: teamId,
    profile_id: profileId,
    season_id: team?.season_id ?? null,
    role,
    status: 'active',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/coaches/teams')
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('team_members').delete().eq('id', formData.get('memberId') as string)
  revalidatePath('/coaches/teams')
}

export async function updateMemberRole(formData: FormData) {
  const supabase = await createClient()
  const memberId = formData.get('memberId') as string
  const role = formData.get('role') as string
  await supabase.from('team_members').update({ role }).eq('id', memberId)
  revalidatePath('/coaches/teams')
}
