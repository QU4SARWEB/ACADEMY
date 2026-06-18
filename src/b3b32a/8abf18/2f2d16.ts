import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

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

export function renderCoachTaskDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTaskDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: task } = await supabase
      .from('tasks')
      .select('*, course_modules(name, course_id, courses(name))')
      .eq('id', id)
      .maybeSingle()

    if (!task) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Tarea no encontrada.</p>'
      return
    }

    const [{ data: submissions }, { data: enrollments }] = await Promise.all([
      supabase
        .from('task_submissions')
        .select('*, enrollments(profile_id, profiles(full_name, avatar_url, email))')
        .eq('task_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('enrollments')
        .select('id, profile_id, profiles(full_name, email)')
        .eq('course_id', task.course_modules?.course_id)
        .eq('status', 'active'),
    ])

    const subs = submissions ?? []
    const allEnrollments = enrollments ?? []
    const submittedIds = new Set(subs.map((s: any) => s.enrollment_id))
    const pendingStudents = allEnrollments.filter((e: any) => !submittedIds.has(e.id))

    const html = `
      <div>
        <a href="#/coaches/tasks" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a tareas
        </a>
        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(task.title)}</h1>
          <p class="mt-1 text-sm text-zinc-400">
            ${escapeHtml(task.course_modules?.courses?.name || '')} / ${escapeHtml(task.course_modules?.name || '')}
          </p>
          <p class="text-sm text-zinc-500">
            Límite: ${task.due_date ? formatDate(task.due_date) : '—'} · Máx: ${task.max_score ?? '—'} pts
          </p>
          ${task.description ? `<p class="mt-2 text-sm text-zinc-300">${escapeHtml(task.description)}</p>` : ''}
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 class="mb-4 font-heading text-lg font-bold text-white">Entregas (${subs.length})</h2>
            <div class="space-y-3">
              ${subs.length === 0 ? '<p class="text-sm text-zinc-500">Sin entregas todavía.</p>' : ''}
              ${subs.map((sub: any) => {
                const profile = sub.enrollments?.profiles
                return `
                  <div class="glass rounded-lg p-4">
                    <div class="mb-2 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                          ${profile?.avatar_url
                            ? `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                            : escapeHtml(profile?.full_name?.charAt(0) ?? '?')
                          }
                        </div>
                        <span class="text-sm font-medium text-white">${escapeHtml(profile?.full_name ?? '—')}</span>
                      </div>
                      <span class="text-xs ${statusColors[sub.status] ?? 'text-zinc-500'}">${statusLabels[sub.status] ?? sub.status}</span>
                    </div>

                    ${(sub.status === 'submitted' || sub.status === 'reviewed' || sub.status === 'late')
                      ? `
                        <div class="border-t border-zinc-800 pt-3">
                          <form class="grade-form space-y-2" data-sub-id="${escapeHtml(sub.id)}">
                            <div class="flex gap-3">
                              <div class="w-24">
                                <label class="block text-xs text-zinc-500">Nota</label>
                                <input name="score" type="number" min="0" max="${task.max_score}" required
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                              </div>
                              <div class="flex-1">
                                <label class="block text-xs text-zinc-500">Feedback</label>
                                <input name="feedback"
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                              </div>
                            </div>
                            <button type="submit"
                              class="rounded bg-[#8B5CF6] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
                              Calificar
                            </button>
                          </form>
                        </div>`
                      : sub.status === 'graded'
                        ? `
                          <div class="border-t border-zinc-800 pt-2 text-sm">
                            <div class="flex items-center gap-4">
                              <span class="text-green-400">Nota: ${sub.score}/${task.max_score}</span>
                              ${sub.feedback ? `<span class="text-zinc-400">· ${escapeHtml(sub.feedback)}</span>` : ''}
                            </div>
                          </div>`
                        : ''
                    }
                  </div>`
              }).join('')}
            </div>
          </div>

          <div>
            <h2 class="mb-4 font-heading text-lg font-bold text-white">Pendientes (${pendingStudents.length})</h2>
            <div class="space-y-2">
              ${pendingStudents.length === 0
                ? '<p class="text-sm text-zinc-500">Todos han entregado.</p>'
                : pendingStudents.map((ps: any) => `
                    <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3">
                      ${Icon('x', 14)}<span class="text-sm text-zinc-300">${escapeHtml(ps.profiles?.full_name ?? '—')}</span>
                    </div>
                  `).join('')
              }
            </div>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.querySelectorAll('.grade-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const subId = (e.target as HTMLElement).getAttribute('data-sub-id')
        if (!subId) return

        const { error } = await supabase
          .from('task_submissions')
          .update({
            score: parseFloat(fd.get('score') as string),
            feedback: (fd.get('feedback') as string) || null,
            status: 'graded',
            graded_at: new Date().toISOString(),
          })
          .eq('id', subId)

        if (error) {
          toast('error', error.message)
        } else {
          toast('success', 'Calificación guardada')
          router.navigate(`/coaches/tasks/${id}`)
        }
      })
    })
  } catch (err) {
    console.error('Error loading task detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tarea</p>'
  }
}
