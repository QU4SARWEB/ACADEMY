import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderStudentGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Calificaciones</h1>
      </div>
      <div class="space-y-3">
        ${(enrollments ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay calificaciones disponibles.</p>'
          : (enrollments ?? []).map((e: any) => `
            <div class="glass rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Sin curso')}</h3>
                  <p class="text-xs text-zinc-500">Progreso: Módulo ${e.current_module || 0}</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-white">${e.final_grade !== null ? e.final_grade : '-'}</p>
                  <p class="text-xs text-zinc-500">Nota final</p>
                </div>
              </div>
              ${e.promoted ? '<span class="mt-2 inline-block text-xs text-green-400">Promovido</span>' : ''}
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar calificaciones</p>'
  }
}
