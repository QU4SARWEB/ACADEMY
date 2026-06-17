'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export default function StudentTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [task, setTask] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, course_modules(name, course_id, courses(name))')
        .eq('id', id)
        .maybeSingle()

      if (!taskData) { setNotFound(true); setLoading(false); return }
      setTask(taskData)

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('profile_id', user.id)
        .eq('course_id', taskData.course_modules?.course_id)
        .eq('status', 'active')
        .maybeSingle()

      const { data: submissionData } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', id)
        .eq('enrollment_id', enrollment?.id ?? 'none')
        .maybeSingle()

      setSubmission(submissionData ?? null)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-zinc-800" />
        <div className="h-8 w-64 rounded bg-zinc-800" />
        <div className="h-4 w-48 rounded bg-zinc-800" />
        <div className="h-4 w-96 rounded bg-zinc-800" />
        <div className="h-32 rounded-xl bg-zinc-800/50" />
      </div>
    )
  }

  if (notFound || !task) return <p className="text-zinc-400">Tarea no encontrada.</p>

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
