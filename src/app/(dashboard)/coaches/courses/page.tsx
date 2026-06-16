import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*, seasons(name)')
    .order('display_order')

  return (
    <div>
      <Link href="/coaches/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Cursos</h1>
        <Link
          href="/coaches/courses/new"
          className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          <Plus size={16} />
          Nuevo curso
        </Link>
      </div>

      <div className="space-y-3">
        {(courses ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay cursos creados todavía.</p>
        )}
        {(courses ?? []).map((course) => (
          <Link
            key={course.id}
            href={`/coaches/courses/${course.id}`}
            className="glass glass-hover flex items-center justify-between rounded-xl p-4"
          >
            <div>
              <h3 className="font-medium text-white">{course.name}</h3>
              <p className="mt-0.5 text-sm text-zinc-500">
                {course.seasons?.name ?? 'Sin season'} · Rango mínimo: {course.min_rank} · {course.duration_months} meses
              </p>
            </div>
            <span className={`text-sm ${course.is_active ? 'text-green-400' : 'text-zinc-500'}`}>
              {course.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
