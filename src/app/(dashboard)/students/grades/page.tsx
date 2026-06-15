import { createClient } from '@/lib/supabase/server'
import { FileText } from 'lucide-react'
import StudentGradeCard from './StudentGradeCard'

export default async function StudentGradesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(name, slug, min_rank), seasons(name)')
    .eq('profile_id', user.id)
    .order('enrolled_at', { ascending: false })

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Notas y Promociones</h1>

      {(enrollments ?? []).length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <FileText size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No tienes cursos inscritos.</p>
        </div>
      )}

      <div className="space-y-4">
        {(enrollments ?? []).map((enr) => (
          <StudentGradeCard key={enr.id} enrollmentId={enr.id} enrollment={enr} />
        ))}
      </div>
    </div>
  )
}
