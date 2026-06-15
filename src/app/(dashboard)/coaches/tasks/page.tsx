import Link from 'next/link'
import { Plus, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  submitted: 'text-blue-400',
  reviewed: 'text-purple-400',
  graded: 'text-green-400',
  late: 'text-red-400',
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, course_modules(name, course_id, courses(name))')
    .order('due_date', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Tareas</h1>
          <p className="mt-1 text-sm text-zinc-400">{tasks?.length ?? 0} tareas creadas</p>
        </div>
        <Link
          href="/coaches/tasks/new"
          className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          <Plus size={16} /> Nueva tarea
        </Link>
      </div>

      <div className="space-y-3">
        {(tasks ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay tareas creadas todavía.</p>
        )}
        {(tasks ?? []).map((task) => (
          <Link
            key={task.id}
            href={`/coaches/tasks/${task.id}`}
            className="glass glass-hover flex items-center justify-between rounded-xl p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-white">{task.title}</h3>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500">
                {task.course_modules?.courses?.name} / {task.course_modules?.name} · Límite: {new Date(task.due_date).toLocaleDateString()}
              </p>
            </div>
            <ArrowUpRight size={16} className="text-zinc-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
