import { createClient } from '@/lib/supabase/server'
import GradeBreakdownCard from './GradeBreakdownCard'

export default async function CoachGradebookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase.from('courses').select('name').eq('id', id).maybeSingle()
  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, profile_id, exam_score, final_grade, promoted, profiles(full_name, avatar_url)')
    .eq('course_id', id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: true })

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Notas · {course.name}</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Desglose: Examen 50% · Evaluaciones 35% · Asistencia 15%
      </p>

      <div className="space-y-4">
        {(enrollments ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay alumnos activos.</p>
        )}
        {(enrollments ?? []).map((enr: any) => (
          <GradeBreakdownCard key={enr.id} enrollment={enr} courseId={id} />
        ))}
      </div>
    </div>
  )
}
