import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderCoachDashboard(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    const { count: studentsCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: coursesCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { data: recentEnrollments } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name, display_name), courses(name)')
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })
      .limit(5)

    const cards = [
      { icon: 'users', label: 'Estudiantes activos', value: String(studentsCount ?? 0), color: '#8B5CF6' },
      { icon: 'bookOpen', label: 'Cursos activos', value: String(coursesCount ?? 0), color: '#6D28D9' },
      { icon: 'clipboardList', label: 'Tareas activas', value: String(tasksCount ?? 0), color: '#7C3AED' },
    ]

    const cardsHtml = cards.map(c => `
      <div class="glass rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background: ${c.color}20">
            <span style="color: ${c.color}">${Icon(c.icon, 20)}</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">${escapeHtml(c.value)}</p>
            <p class="text-xs text-zinc-500">${escapeHtml(c.label)}</p>
          </div>
        </div>
      </div>
    `).join('')

    const recentHtml = (recentEnrollments ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No hay inscripciones recientes.</p>'
      : (recentEnrollments ?? []).map((e: any) => {
          const name = e.profiles?.display_name || e.profiles?.full_name || 'Desconocido'
          const courseName = e.courses?.name || 'Sin curso'
          return `
            <div class="glass rounded-lg px-4 py-3 text-sm">
              <span class="text-white">${escapeHtml(name)}</span>
              <span class="text-zinc-500"> — ${escapeHtml(courseName)}</span>
              <span class="text-zinc-600 text-xs ml-2">${formatDate(e.enrolled_at)}</span>
            </div>`
        }).join('')

    const userName = profile?.display_name || profile?.full_name || 'Coach'

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Panel de control de QU<span class="text-[#8B5CF6]">4</span>SAR</p>
      </div>
      <div class="mb-8 grid gap-4 sm:grid-cols-3">${cardsHtml}</div>
      <div>
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Inscripciones recientes</h2>
        <div class="space-y-2">${recentHtml}</div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading coach dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el dashboard</p>'
  }
}
