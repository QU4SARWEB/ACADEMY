import { supabase } from '@/304244'
import type { Profile, Role } from '@/d14a80'
import { store } from '@/9ed39e/8cd892'

const ROLE_PREFIX: Record<string, string> = {
  coach: 'coaches',
  student: 'students',
  player: 'players',
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

  await getProfile()
  return { redirect: `/${ROLE_PREFIX[profile.role] || profile.role}/dashboard` }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: string,
  rank = 'Unranked',
): Promise<{ error?: string; success?: boolean }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role, rank } },
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Error al crear usuario' }

  // Profile is auto-created by DB trigger; upsert to overwrite with form data
  await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name: fullName,
    role,
    rank,
    is_active: true,
  }, { onConflict: 'id' })

  return { success: true }
}

export async function signOut(): Promise<void> {
  try { await supabase.auth.signOut() } catch {}
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
