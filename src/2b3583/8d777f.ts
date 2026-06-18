import { supabase } from '@/304244'
import type { Profile } from '@/d14a80'

const ROLE_PREFIX: Record<string, string> = {
  coach: 'coaches',
  student: 'students',
  player: 'players',
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  return data
}

export function getRolePrefix(role: string): string {
  return ROLE_PREFIX[role] || role
}
