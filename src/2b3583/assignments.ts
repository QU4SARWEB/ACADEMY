import { supabase } from '@/304244'

export async function getAssignedCourseIds(coachId: string): Promise<string[]> {
  const { data } = await supabase
    .from('course_assignments')
    .select('course_id')
    .eq('coach_id', coachId)
  return (data ?? []).map((a: any) => a.course_id)
}
