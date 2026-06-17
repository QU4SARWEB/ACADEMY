'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { gradeSubmission } from './actions'

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

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [task, setTask] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [allEnrollments, setAllEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, course_modules(name, course_id, courses(name))')
        .eq('id', id)
        .maybeSingle()

      if (!taskData) { setLoading(false); return }

      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('*, enrollments(profile_id, profiles(full_name, avatar_url, email))')
        .eq('task_id', id)
        .order('created_at', { ascending: false })

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('id, profile_id, profiles(full_name, email)')
        .eq('course_id', taskData.course_modules?.course_id)
        .eq('status', 'active')

      setTask(taskData)
      setSubmissions(submissionsData ?? [])
      setAllEnrollments(enrollmentsData ?? [])
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-zinc-800" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!task) return <p className="text-zinc-400">Tarea no encontrada.</p>

  const submittedIds = new Set(submissions.map((s) => s.enrollment_id))
  const pendingStudents = allEnrollments.filter((e) => !submittedIds.has(e.id))

  return (
    <div>
      <Link href="/coaches/tasks" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a tareas
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{task.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {task.course_modules?.courses?.name} / {task.course_modules?.name}
        </p>
        <p className="text-sm text-zinc-500">
          Límite: {new Date(task.due_date).toLocaleString()} · Máx: {task.max_score} pts
        </p>
        {task.description && <p className="mt-2 text-sm text-zinc-300">{task.description}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-heading text-lg font-bold text-white">
            Entregas ({submissions.length})
          </h2>

          <div className="space-y-3">
            {submissions.length === 0 && (
              <p className="text-sm text-zinc-500">Sin entregas todavía.</p>
            )}
            {submissions.map((sub) => (
              <div key={sub.id} className="glass rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                      {sub.enrollments?.profiles?.avatar_url ? (
                        <img src={sub.enrollments.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        sub.enrollments?.profiles?.full_name?.charAt(0) ?? '?'
                      )}
                    </div>
                    <span className="text-sm font-medium text-white">{sub.enrollments?.profiles?.full_name}</span>
                  </div>
                  <span className={`text-xs ${statusColors[sub.status] ?? 'text-zinc-500'}`}>
                    {statusLabels[sub.status] ?? sub.status}
                  </span>
                </div>

                {sub.status === 'submitted' || sub.status === 'reviewed' || sub.status === 'late' ? (
                  <div className="border-t border-zinc-800 pt-3">
                    <form action={gradeSubmission} className="space-y-2">
                      <input type="hidden" name="submissionId" value={sub.id} />
                      <input type="hidden" name="taskId" value={id} />

                      <div className="flex gap-3">
                        <div className="w-24">
                          <label className="block text-xs text-zinc-500">Nota</label>
                          <input name="score" type="number" min={0} max={task.max_score} required
                            className="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-zinc-500">Feedback</label>
                          <input name="feedback"
                            className="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                        </div>
                      </div>

                      {sub.files && sub.files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(sub.files as Array<{ url: string; name: string }>).map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-purple-400 hover:text-purple-300">
                              <Eye size={12} /> {f.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <button type="submit" className="rounded bg-[#8B5CF6] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
                        Calificar
                      </button>
                    </form>
                  </div>
                ) : sub.status === 'graded' ? (
                  <div className="border-t border-zinc-800 pt-2 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-green-400">Nota: {sub.score}/{task.max_score}</span>
                      {sub.feedback && <span className="text-zinc-400">· {sub.feedback}</span>}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-heading text-lg font-bold text-white">
            Pendientes ({pendingStudents.length})
          </h2>
          <div className="space-y-2">
            {pendingStudents.length === 0 ? (
              <p className="text-sm text-zinc-500">Todos han entregado.</p>
            ) : (
              pendingStudents.map((ps) => (
                <div key={ps.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3">
                  <Clock size={14} className="text-yellow-400" />
                  <span className="text-sm text-zinc-300">{(ps as any).profiles?.full_name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
