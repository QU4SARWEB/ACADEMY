import { supabase } from '@/304244'
import type { Profile, Role } from '@/d14a80'
import { store } from '@/9ed39e/8cd892'

const ROLE_PREFIX: Record<string, string> = {
  coach: 'coaches',
  student: 'students',
}
const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'https://academy-psi-lemon.vercel.app'

export function isDesktopApp(): boolean {
  return Boolean((window as any).__TAURI_INTERNALS__)
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export type ProfileLoad = { profile: Profile | null; error: boolean }

export async function loadProfile(): Promise<ProfileLoad> {
  const session = await getSession()
  if (!session?.user?.id) return { profile: null, error: false }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) {
    return { profile: null, error: true }
  }

  store.set('profile', data)
  return { profile: data as Profile | null, error: false }
}

export async function getProfile(): Promise<Profile | null> {
  const { profile } = await loadProfile()
  return profile
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
  referral = '',
  platform = 'pc',
): Promise<{ error?: string; success?: boolean }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role, rank } },
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Error al crear usuario' }

  await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name: fullName,
    role,
    rank,
    platform,
    is_active: true,
  }, { onConflict: 'id' })

  // Process referral code via SECURITY DEFINER function (bypasses RLS)
  if (referral) {
    const { data: used, error: rpcErr } = await supabase.rpc('use_referral_code', {
      p_code: referral,
      p_user_id: authData.user.id,
    })
    if (rpcErr) {
      console.error('Referral code error:', rpcErr)
    } else if (used) {
      store.set<Profile | null>('profile', null)
    } else {
      console.warn('Referral code not found or already used:', referral)
    }
  }

  return { success: true }
}

export async function signOut(): Promise<void> {
  try { await supabase.auth.signOut() } catch {}
  store.set<Profile | null>('profile', null)
  store.set('session', null)
  location.hash = isDesktopApp() ? '/login' : '/'
}

export async function resetPassword(email: string): Promise<{ error?: string; success?: boolean }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${WEB_APP_URL}/#/reset-password`,
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
  if (hash.startsWith('/p/')) return true
  if (hash === '/' || hash === '/about' || hash === '/login' || hash === '/register' || hash === '/reset-password') return true

  const session = await getSession()
  if (!session) {
    location.hash = '/login'
    return false
  }
  const profile = store.get<Profile>('profile')
  let currentProfile: Profile | null = profile ?? null

  if (!currentProfile) {
    const result = await loadProfile()
    currentProfile = result.profile
    if (!currentProfile && result.error) {
      // Fallo transitorio (deploy, red): conservar la sesión y reintentar
      // en el siguiente intento. No hacemos signOut() ni borramos el token.
      return false
    }
  }

  // Perfil realmente inexistente (cuenta eliminada): la sesión ya no es válida.
  if (!currentProfile) {
    await supabase.auth.signOut()
    location.hash = '/login'
    return false
  }

  // Allow preview mode for coaches
  const previewRole = sessionStorage.getItem('previewRole')
  if (previewRole) {
    const previewPrefix = ROLE_PREFIX[previewRole]
    if (previewPrefix && !hash.startsWith(`/${previewPrefix}`) && !hash.startsWith('/payments') && !hash.startsWith('/settings') && !hash.startsWith('/support') && !hash.startsWith('/chat') && !hash.startsWith('/calls') && hash !== '/') {
      location.hash = `/${previewPrefix}/dashboard`
      return false
    }
    return true
  }

  const prefix = ROLE_PREFIX[currentProfile.role]
  if (prefix && !hash.startsWith(`/${prefix}`) && !hash.startsWith('/payments') && !hash.startsWith('/settings') && !hash.startsWith('/support') && !hash.startsWith('/chat') && !hash.startsWith('/calls') && hash !== '/') {
    location.hash = `/${prefix}/dashboard`
    return false
  }

  return true
}
