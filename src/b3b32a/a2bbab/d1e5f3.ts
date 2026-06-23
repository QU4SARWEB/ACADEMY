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
      .select('*, courses(name, description, min_rank, duration_months)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis Cursos</h1>
        <p class="mt-1 text-sm text-zinc-500">Tus cursos activos</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${(enrollments ?? []).length === 0
          ? '<p class="text-sm text-zinc-500 col-span-full">No estás inscrito en ningún curso.</p>'
          : (enrollments ?? []).map((e: any) => `
            <div class="glass rounded-xl p-5 transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5">
              <div class="flex items-center gap-3 mb-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
                  ${Icon('bookOpen', 20)}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-medium text-white truncate">${escapeHtml(e.courses?.name || 'Curso')}</h3>
                  <p class="text-xs text-zinc-500">${e.courses?.duration_months || 0} meses${e.courses?.min_rank ? ' · ' + escapeHtml(e.courses.min_rank) : ''}</p>
                </div>
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
