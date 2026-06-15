import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClipboardList, ArrowUpRight } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  submitted: 'text-blue-400',
  reviewed: 'text-purple-400',
  graded: 'text-green-400',
  late: 'text-red-400',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  submitted: 'Entregada',
  reviewed: 'En revisión',
  graded: 'Calificada',
  late: 'Atrasada',
}

export default async function StudentTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')

  const courseIds = enrollments?.map((e) => e.course_id) ?? []

  const { data: modules } = await supabase
    .from('course_modules')
    .select('id')
    .in('course_id', courseIds.length > 0 ? courseIds : ['none'])

  const moduleIds = modules?.map((m) => m.id) ?? []

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, course_modules(name, course_id, courses(name))')
    .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
    .order('due_date', { ascending: false })

  const { data: enrollmentsWithIds } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', user.id)
    .eq('status', 'active')

  const enrollmentIds = enrollmentsWithIds?.map((e) => e.id) ?? []

  const { data: submissions } = await supabase
    .from('task_submissions')
    .select('task_id, status, score')
    .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['none'])

  const submissionMap: Record<string, typeof submissions> = {}
  for (const sub of submissions ?? []) {
    submissionMap[sub.task_id] = [sub]
  }

  function getStatus(taskId: string) {
    const subs = submissionMap[taskId]
    if (!subs || subs.length === 0) return 'pending'
    return subs[0].status
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Tareas</h1>
        <p className="mt-1 text-sm text-zinc-400">Tus tareas asignadas</p>
      </div>

      <div className="space-y-3">
        {(tasks ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay tareas asignadas.</p>
        )}
        {(tasks ?? []).map((task) => {
          const status = getStatus(task.id)
          return (
            <Link
              key={task.id}
              href={`/students/tasks/${task.id}`}
              className="glass glass-hover flex items-center justify-between rounded-xl p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-white">{task.title}</h3>
                  <span className={`text-xs ${statusColors[status]}`}>{statusLabels[status]}</span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {task.course_modules?.courses?.name} / {task.course_modules?.name} · Límite: {new Date(task.due_date).toLocaleDateString()}
                </p>
              </div>
              <ArrowUpRight size={16} className="text-zinc-500" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
