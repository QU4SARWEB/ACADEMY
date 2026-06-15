import { createClient } from '@/lib/supabase/server'
import type { Profile, Enrollment } from '@/types'

export async function getStudents() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, riot_id, rank, is_active, created_at')
    .eq('role', 'student')
    .order('full_name')

  return data ?? []
}

export async function getStudent(id: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!profile) return null

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(name, slug), seasons(name)')
    .eq('profile_id', id)
    .order('enrolled_at', { ascending: false })

  return { profile, enrollments: enrollments ?? [] }
}

export async function getPlayers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, riot_id, rank, is_active, created_at')
    .eq('role', 'player')
    .order('full_name')

  return data ?? []
}
