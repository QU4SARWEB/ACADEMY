import { createClient } from '@/lib/supabase/server'

export async function getTasks(seasonId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('*, course_modules(name, course_id, courses(name))')
    .order('due_date', { ascending: false })

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data } = await query
  return data ?? []
}

export async function getTask(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('*, course_modules(name, course_id, courses(name))')
    .eq('id', id)
    .maybeSingle()

  return data
}

export async function getSubmissions(taskId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('task_submissions')
    .select('*, enrollments(profile_id, profiles(full_name, avatar_url))')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  return data ?? []
}
