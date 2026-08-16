import { supabase } from '@/304244'

export function isStudentPreview(): boolean {
  return sessionStorage.getItem('previewRole') === 'student'
}

export async function getStudentCourseIds(uid: string): Promise<string[]> {
  if (isStudentPreview()) {
    const { data } = await supabase.from('courses').select('id').eq('is_active', true)
    return (data ?? []).map((c: any) => c.id)
  }
  const { data } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('profile_id', uid)
    .eq('status', 'active')
  return [...new Set((data ?? []).map((e: any) => e.course_id).filter(Boolean))]
}

export async function getStudentEnrollments(uid: string): Promise<any[]> {
  if (isStudentPreview()) {
    const { data } = await supabase
      .from('courses')
      .select('id, name, slug, description, duration_months, cover_url, min_rank, min_pass_grade')
      .eq('is_active', true)
      .order('display_order')
    return (data ?? []).map((c: any) => ({
      id: `preview-${c.id}`,
      course_id: c.id,
      profile_id: uid,
      status: 'active',
      courses: c,
    }))
  }
  const { data } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('profile_id', uid)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })
  return data ?? []
}
