import { supabase } from '@/304244'
import type { Profile, Role } from '@/d14a80'
import { store } from '@/9ed39e/8cd892'

const ROLE_PREFIX: Record<string, string> = {
  coach: 'coaches',
  student: 'students',
  player: 'players',
}

const RANK_COURSE_MAP: Record<string, string> = {
  'Unranked': 'Rookie', 'Hierro': 'Rookie', 'Bronce': 'Trainee',
  'Plata': 'Amateur', 'Oro': 'Competitor', 'Platino': 'Elite',
  'Diamante': 'Semi-Pro', 'Ascendente': 'Pro', 'Inmortal': 'Pro', 'Radiante': 'Pro',
}

export async function autoEnrollStudent(profileId: string, rank?: string | null): Promise<void> {
  try {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('status', 'active')
    if (count && count > 0) return

    const targetCourseName = (rank ? RANK_COURSE_MAP[rank] : null) || 'Rookie'
    const { data: course } = await supabase
      .from('courses')
      .select('id, name')
      .eq('name', targetCourseName)
      .eq('is_active', true)
      .maybeSingle()
    if (!course) return

    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()
    if (!season) return

    const { data: enrollment } = await supabase
      .from('enrollments')
      .upsert({
        profile_id: profileId,
        course_id: course.id,
        season_id: season.id,
        type: 'student',
        status: 'active',
      }, { onConflict: 'profile_id,course_id,season_id', ignoreDuplicates: true })
      .select()
      .maybeSingle()

    if (enrollment) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('scholarship')
        .eq('id', profileId)
        .maybeSingle()
      await supabase.from('payments').upsert({
        profile_id: profileId,
        enrollment_id: enrollment.id,
        season_id: season.id,
        type: 'student',
        status: prof?.scholarship ? 'scholarship' : 'pending',
        amount: 1.54,
      }, { onConflict: 'enrollment_id', ignoreDuplicates: true })
    }
  } catch (err) {
    console.error('autoEnrollStudent error:', err)
  }
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProfile(): Promise<Profile | null> {
  const session = await getSession()
  if (!session?.user?.id) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  store.set('profile', data)
  return data
}

export async function signIn(email: string, password: string): Promise<{ error?: string; redirect?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta está desactivada. Contacta a un coach.' }
  }

  const fullProfile = await getProfile()
  if (profile.role === 'student' || profile.role === 'player') {
    await autoEnrollStudent(data.user.id, (fullProfile as any)?.rank)
  }
  return { redirect: `/${ROLE_PREFIX[profile.role] || profile.role}/dashboard` }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: string,
): Promise<{ error?: string; success?: boolean }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Error al crear usuario' }

  // Profile is auto-created by DB trigger; try insert in case trigger hasn't run yet
  await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name: fullName,
    role,
    is_active: true,
  }, { onConflict: 'id', ignoreDuplicates: true })

  if (role === 'student' || role === 'player') {
    autoEnrollStudent(authData.user.id)
  }

  return { success: true }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  store.set<Profile | null>('profile', null)
  store.set('session', null)
  location.hash = '/'
}

export async function resetPassword(email: string): Promise<{ error?: string; success?: boolean }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(password: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return {}
}

export async function authGuard(destPath?: string): Promise<boolean> {
  const hash = destPath || location.hash.slice(1) || '/'
  if (hash.startsWith('/p/') || hash === '/members') return true
  if (hash === '/login' || hash === '/register' || hash === '/reset-password') return true

  const session = await getSession()
  if (!session) {
    location.hash = '/login'
    return false
  }
  const profile = store.get<Profile>('profile')
  let currentProfile: Profile | null = profile ?? null

  if (!currentProfile) {
    currentProfile = await getProfile()
  }

  if (!currentProfile) {
    await supabase.auth.signOut()
    location.hash = '/login'
    return false
  }

  const prefix = ROLE_PREFIX[currentProfile.role]
  if (prefix && !hash.startsWith(`/${prefix}`) && !hash.startsWith('/payments') && !hash.startsWith('/notifications') && !hash.startsWith('/logs') && !hash.startsWith('/chat') && !hash.startsWith('/settings') && !hash.startsWith('/support') && hash !== '/') {
    location.hash = `/${prefix}/dashboard`
    return false
  }

  return true
}
