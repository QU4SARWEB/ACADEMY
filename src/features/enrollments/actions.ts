'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createPayment } from '@/services/payments'

export async function assignToCourse(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) console.error(authErr)
  if (!user) throw new Error('No autenticado')

  const profileId = formData.get('profileId') as string
  const courseId = formData.get('courseId') as string
  const seasonId = formData.get('seasonId') as string
  const type = formData.get('type') as 'student' | 'player'

  if (!profileId || !courseId || !seasonId) {
    throw new Error('Faltan datos requeridos')
  }

  const { data: existing, error: existingErr } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', profileId)
    .eq('course_id', courseId)
    .eq('season_id', seasonId)
    .maybeSingle()

  if (existingErr) console.error(existingErr)
  if (existing) {
    throw new Error('El usuario ya está inscrito en este curso esta temporada')
  }

  const { error } = await supabase.from('enrollments').insert({
    profile_id: profileId,
    course_id: courseId,
    season_id: seasonId,
    type: type || 'student',
    status: 'active',
    current_module: 1,
  })

  if (error) throw new Error(error.message)

  const { data: existingPayment, error: payErr } = await supabase
    .from('payments')
    .select('id')
    .eq('profile_id', profileId)
    .eq('season_id', seasonId)
    .maybeSingle()

  if (payErr) console.error(payErr)
  if (!existingPayment) {
    await createPayment(supabase, {
      profile_id: profileId,
      season_id: seasonId,
      type,
    })
  }

  revalidatePath(`/coaches/students/${profileId}`)
  revalidatePath('/coaches/courses')
  revalidatePath('/coaches/students')
}

export async function selfEnroll(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) console.error(authErr)
  if (!user) throw new Error('No autenticado')

  const courseId = formData.get('courseId') as string

  if (!courseId) throw new Error('Falta el curso')

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profErr) console.error(profErr)
  if (!profile) throw new Error('Perfil no encontrado')

  if (profile.role !== 'student' && profile.role !== 'player') {
    throw new Error('Solo estudiantes y jugadores pueden inscribirse')
  }

  const { data: activeSeason, error: seasonErr } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (seasonErr) console.error(seasonErr)
  if (!activeSeason) throw new Error('No hay temporada activa')

  const { data: existing, error: existErr } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', user.id)
    .eq('course_id', courseId)
    .eq('season_id', activeSeason.id)
    .maybeSingle()

  if (existErr) console.error(existErr)
  if (existing) {
    throw new Error('Ya estás inscrito en este curso')
  }

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, min_rank')
    .eq('id', courseId)
    .maybeSingle()

  if (courseErr) console.error(courseErr)
  if (!course) throw new Error('Curso no encontrado')

  if (course.min_rank && profile.role === 'player') {
    const { data: playerProfile, error: rankErr } = await supabase
      .from('profiles')
      .select('rank')
      .eq('id', user.id)
      .maybeSingle()
    if (rankErr) console.error(rankErr)

    const RANK_ORDER: Record<string, number> = {
      Unranked: 0, Iron: 1, Bronze: 2, Silver: 3, Gold: 4,
      Platinum: 5, Diamond: 6, Ascendant: 7, Immortal: 8, Radiant: 9,
    }
    const playerRank = RANK_ORDER[playerProfile?.rank ?? 'Unranked'] ?? 0
    const minRank = RANK_ORDER[course.min_rank] ?? 0
    if (playerRank < minRank) {
      throw new Error(`Rango mínimo requerido: ${course.min_rank}`)
    }
  }

  const { error } = await supabase.from('enrollments').insert({
    profile_id: user.id,
    course_id: courseId,
    season_id: activeSeason.id,
    type: profile.role,
    status: 'active',
    current_module: 1,
  })

  if (error) throw new Error(error.message)

  const { data: existingPayment, error: payErr } = await supabase
    .from('payments')
    .select('id')
    .eq('profile_id', user.id)
    .eq('season_id', activeSeason.id)
    .maybeSingle()

  if (payErr) console.error(payErr)
  if (!existingPayment) {
    await createPayment(supabase, {
      profile_id: user.id,
      season_id: activeSeason.id,
      type: profile.role as 'student' | 'player',
    })
  }

  revalidatePath('/students/courses')
  revalidatePath('/students/dashboard')
}
