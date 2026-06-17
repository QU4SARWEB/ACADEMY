'use client'

import Link from 'next/link'
import { ClipboardList, ArrowUpRight, ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/formatDate'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

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

interface Task {
  id: string
  title: string
  due_date: string
  course_modules: {
    name: string
    courses: { name: string } | null
  } | null
}

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissionMap, setSubmissionMap] = useState<Record<string, any[]>>({})

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('profile_id', session.user.id)
        .eq('status', 'active')

      const courseIds = enrollments?.map((e) => e.course_id) ?? []
      if (courseIds.length === 0) return

      const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .in('course_id', courseIds)

      const moduleIds = modules?.map((m) => m.id) ?? []
      if (moduleIds.length === 0) return

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, course_modules(name, course_id, courses(name))')
        .in('module_id', moduleIds)
        .order('due_date', { ascending: false })

      setTasks(tasksData ?? [])

      const { data: enrollmentsWithIds } = await supabase
        .from('enrollments')
        .select('id')
        .eq('profile_id', session.user.id)
        .eq('status', 'active')

      const enrollmentIds = enrollmentsWithIds?.map((e) => e.id) ?? []

      const { data: submissions } = await supabase
        .from('task_submissions')
        .select('task_id, status, score')
        .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['none'])

      const smap: Record<string, any[]> = {}
      for (const sub of submissions ?? []) {
        smap[sub.task_id] = [sub]
      }
      setSubmissionMap(smap)
    })()
  }, [])

  function getStatus(taskId: string, dueDate: string) {
    const subs = submissionMap[taskId]
    if (!subs || subs.length === 0) {
      return new Date() > new Date(dueDate) ? 'late' : 'pending'
    }
    return subs[0].status
  }

  return (
    <div>
      <Link href="/students/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Tareas</h1>
        <p className="mt-1 text-sm text-zinc-400">Tus tareas asignadas</p>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-sm text-zinc-500">No hay tareas asignadas.</p>
        )}
        {tasks.map((task) => {
          const status = getStatus(task.id, task.due_date)
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
                  {task.course_modules?.courses?.name} / {task.course_modules?.name} · Límite: {formatDate(task.due_date)}
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
