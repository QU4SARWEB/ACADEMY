import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, ArrowRight, Plus } from 'lucide-react'
import { selfEnroll } from '@/features/enrollments/actions'

export default async function StudentCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(name, slug, display_order, duration_months), seasons(name)')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  const enrolledCourseIds = (enrollments ?? []).map((e) => e.course_id)
  const { data: availableCourses } = enrolledCourseIds.length > 0
    ? await supabase.from('courses').select('id, name, description, duration_months, min_rank').eq('is_active', true).not('id', 'in', `(${enrolledCourseIds.join(',')})`).order('name')
    : await supabase.from('courses').select('id, name, description, duration_months, min_rank').eq('is_active', true).order('name')

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Mis cursos</h1>

      <div className="space-y-3">
        {(enrollments ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No estás inscrito en ningún curso actualmente.</p>
        )}
        {(enrollments ?? []).map((enr) => (
          <Link
            key={enr.id}
            href={`/students/courses/${enr.course_id}`}
            className="glass glass-hover flex items-center justify-between rounded-xl p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
                <BookOpen size={20} className="text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="font-medium text-white">{enr.courses?.name}</h3>
                <p className="text-sm text-zinc-500">
                  {enr.seasons?.name} · {enr.courses?.duration_months} meses
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-500" />
          </Link>
        ))}
      </div>

      {(availableCourses ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-heading text-lg font-bold text-white">Cursos disponibles</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(availableCourses ?? []).map((course) => (
              <div key={course.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{course.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {course.duration_months} meses{course.min_rank ? ` · Rango mínimo: ${course.min_rank}` : ''}
                    </p>
                    {course.description && (
                      <p className="mt-1 text-xs text-zinc-400">{course.description}</p>
                    )}
                  </div>
                </div>
                <form action={selfEnroll} className="mt-3">
                  <input type="hidden" name="courseId" value={course.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
                  >
                    <Plus size={14} /> Inscribirme
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
