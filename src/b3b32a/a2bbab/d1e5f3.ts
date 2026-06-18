import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderPlayerCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerCourses(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name, description, min_rank, duration_months), seasons(name)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis Cursos</h1>
        <p class="mt-1 text-sm text-zinc-500">Tus cursos activos</p>
      </div>
      <div class="space-y-3">
        ${(enrollments ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>'
          : (enrollments ?? []).map((e: any) => `
            <div class="glass rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Curso')}</h3>
                  <p class="mt-0.5 text-sm text-zinc-500">
                    ${escapeHtml(e.seasons?.name || '')} ${e.courses?.min_rank ? '· Rango mín: ' + escapeHtml(e.courses.min_rank) : ''}
                  </p>
                </div>
                <span class="text-xs text-green-400">${e.status}</span>
              </div>
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
  }
}
