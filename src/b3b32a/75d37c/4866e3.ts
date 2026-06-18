import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderStudentDashboard(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name, slug, display_order), seasons(name, id)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    const courseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)
    const seasonIds = [...new Set((enrollments ?? []).map((e: any) => e.season_id).filter(Boolean))]

    const paymentMap = new Map<string, string>()
    if (seasonIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('season_id, status')
        .eq('profile_id', session.user.id)
        .in('season_id', seasonIds)
      for (const p of payments ?? []) paymentMap.set(p.season_id, p.status)
    }

    let tasksData: any[] = []
    if (courseIds.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date, course_modules(name)')
        .in('course_id', courseIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date')
        .limit(5)
      tasksData = data ?? []
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', session.user.id)
      .maybeSingle()

    const userName = profile?.display_name || profile?.full_name || 'Estudiante'

    const enrollHtml = (enrollments ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>'
      : (enrollments ?? []).map((e: any) => {
          const payStatus = paymentMap.get(e.season_id)
          return `
            <a href="#/students/courses/${escapeHtml(e.course_id)}"
               class="glass glass-hover flex items-center justify-between rounded-xl p-4">
              <div class="flex items-center gap-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
                  ${Icon('bookOpen', 20)}
                </div>
                <div>
                  <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Sin nombre')}</h3>
                  <p class="text-xs text-zinc-500">${escapeHtml(e.seasons?.name || '')} · ${e.status}</p>
                </div>
              </div>
              ${payStatus
                ? `<span class="text-xs ${payStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'}">${escapeHtml(payStatus)}</span>`
                : ''}
            </a>`
        }).join('')

    const tasksHtml = (tasksData ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No hay tareas próximas.</p>'
      : (tasksData ?? []).map((t: any) => `
          <a href="#/students/tasks/${escapeHtml(t.id)}"
             class="glass glass-hover flex items-center justify-between rounded-xl px-4 py-3 text-sm">
            <div>
              <span class="text-white">${escapeHtml(t.title)}</span>
              <span class="text-zinc-500 ml-2">${escapeHtml(t.course_modules?.name || '')}</span>
            </div>
            <span class="text-xs text-zinc-500">${formatDate(t.due_date)}</span>
          </a>
        `).join('')

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Panel de estudiante</p>
      </div>
      <div class="mb-8">
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Mis cursos</h2>
        <div class="space-y-3">${enrollHtml}</div>
      </div>
      <div>
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Próximas tareas</h2>
        <div class="space-y-2">${tasksHtml}</div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading student dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
