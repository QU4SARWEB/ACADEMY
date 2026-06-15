import { createClient } from '@/lib/supabase/server'
import ExamGradingForm from './ExamGradingForm'

export default async function CoachExamPage({
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
    .select('id, profile_id, exam_score, final_grade, profiles(full_name, avatar_url)')
    .eq('course_id', id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: true })

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Examen Final · {course.name}</h1>
      <p className="mb-6 text-sm text-zinc-400">Registra la nota del examen final (0–100). Peso: 50% de la nota final.</p>

      <ExamGradingForm courseId={id} enrollments={enrollments as any[]} />
    </div>
  )
}
