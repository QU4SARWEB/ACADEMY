import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import SubmitTaskForm from './SubmitTaskForm'

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

export default async function StudentTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: task } = await supabase
    .from('tasks')
    .select('*, course_modules(name, course_id, courses(name))')
    .eq('id', id)
    .maybeSingle()

  if (!task) return <p className="text-zinc-400">Tarea no encontrada.</p>

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', user.id)
    .eq('course_id', task.course_modules?.course_id)
    .eq('status', 'active')
    .maybeSingle()

  const { data: submission } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', id)
    .eq('enrollment_id', enrollment?.id ?? 'none')
    .maybeSingle()

  return (
    <div>
      <Link href="/students/tasks" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a tareas
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-white">{task.title}</h1>
          {submission && (
            <span className={`text-xs ${statusColors[submission.status]}`}>
              {statusLabels[submission.status]}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {task.course_modules?.courses?.name} / {task.course_modules?.name}
        </p>
        <p className="text-sm text-zinc-500">
          Límite: {new Date(task.due_date).toLocaleString()} · Máx: {task.max_score} pts
        </p>
        {task.description && <p className="mt-2 text-sm text-zinc-300">{task.description}</p>}
      </div>

      {submission?.status === 'graded' ? (
        <div className="glass rounded-xl p-5">
          <h2 className="font-heading text-lg font-bold text-white">Resultado</h2>
          <div className="mt-3 flex items-center gap-2">
            {submission.score != null && submission.score >= (task.max_score / 2) ? (
              <CheckCircle size={20} className="text-green-400" />
            ) : (
              <XCircle size={20} className="text-red-400" />
            )}
            <span className="text-lg font-bold text-white">{submission.score}/{task.max_score}</span>
          </div>
          {submission.feedback && (
            <p className="mt-2 text-sm text-zinc-400">Feedback: {submission.feedback}</p>
          )}
        </div>
      ) : submission ? (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-yellow-400" />
            <p className="text-sm text-zinc-300">Tarea entregada - pendiente de calificación</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl p-5">
          <h2 className="mb-4 font-heading text-lg font-bold text-white">Entregar tarea</h2>
          <SubmitTaskForm
            taskId={id}
            courseId={task.course_modules?.course_id}
            dueDate={task.due_date}
          />
        </div>
      )}
    </div>
  )
}
