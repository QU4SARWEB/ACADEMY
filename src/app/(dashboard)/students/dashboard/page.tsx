import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, ClipboardList, Calendar, FileText, ArrowRight } from 'lucide-react'

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(name, slug, display_order), seasons(name)')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  const courseIds = enrollments?.map((e) => e.course_id) ?? []

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, course_modules(name)')
    .in('course_id', courseIds.length > 0 ? courseIds : ['none'])
    .gte('due_date', new Date().toISOString())
    .order('due_date')
    .limit(5)

  const stats = [
    { label: 'Cursos inscritos', value: enrollments?.length ?? 0, icon: BookOpen, color: 'text-purple-400' },
    { label: 'Tareas pendientes', value: tasks?.length ?? 0, icon: ClipboardList, color: 'text-yellow-400' },
  ]

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <s.icon size={24} className={s.color} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Mis cursos</h2>
            <Link href="/students/courses" className="text-xs text-[#8B5CF6] hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {(enrollments ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>
            )}
            {(enrollments ?? []).map((enr) => (
              <Link
                key={enr.id}
                href={`/students/courses/${enr.course_id}`}
                className="glass glass-hover flex items-center gap-3 rounded-lg px-4 py-3"
              >
                <BookOpen size={16} className="text-purple-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{enr.courses?.name}</p>
                  <p className="text-xs text-zinc-500">{enr.seasons?.name}</p>
                </div>
                <ArrowRight size={14} className="text-zinc-500" />
              </Link>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Próximas tareas</h2>
            <Link href="/students/tasks" className="text-xs text-[#8B5CF6] hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-2">
            {(tasks ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">No hay tareas pendientes.</p>
            )}
            {(tasks ?? []).map((t) => (
              <Link
                key={t.id}
                href={`/students/tasks/${t.id}`}
                className="glass glass-hover flex items-center gap-3 rounded-lg px-4 py-3"
              >
                <ClipboardList size={16} className="text-yellow-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <p className="text-xs text-zinc-500">{(t.course_modules as any)?.name} · {new Date(t.due_date).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Link href="/students/schedule" className="glass glass-hover flex items-center gap-4 rounded-xl p-5">
          <Calendar size={24} className="text-blue-400" />
          <div>
            <p className="font-medium text-white">Ver horario académico</p>
            <p className="text-sm text-zinc-500">Clases, tutorías y sesiones</p>
          </div>
        </Link>
        <Link href="/students/grades" className="glass glass-hover flex items-center gap-4 rounded-xl p-5">
          <FileText size={24} className="text-green-400" />
          <div>
            <p className="font-medium text-white">Ver notas</p>
            <p className="text-sm text-zinc-500">Evaluaciones y progreso</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
