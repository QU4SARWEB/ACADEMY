import { createClient } from '@/lib/supabase/server'
import type { Course, CourseModule } from '@/types'

export async function getCourses(seasonId?: string): Promise<Course[]> {
  const supabase = await createClient()
  let query = supabase.from('courses').select('*').order('display_order')

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data } = await query
  return data ?? []
}

export async function getCourse(id: string): Promise<Course | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('*').eq('id', id).maybeSingle()
  return data
}

export async function getModules(courseId: string): Promise<CourseModule[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('display_order')

  return data ?? []
}

export async function getModule(id: string): Promise<CourseModule | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('course_modules').select('*').eq('id', id).maybeSingle()
  return data
}

export async function getMaterials(moduleId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('materials')
    .select('*')
    .eq('module_id', moduleId)
    .order('display_order')

  return data ?? []
}

export async function getActiveSeason() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  return data
}
