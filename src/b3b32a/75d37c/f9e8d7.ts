import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderStudentEvalList(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentEvalList(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, courses(name)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const courseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id))]

    const { data: mods } = courseIds.length > 0
      ? await supabase.from('course_modules').select('id, name, course_id').in('course_id', courseIds).order('display_order')
      : { data: [] }

    const moduleIds = (mods ?? []).map((m: any) => m.id)

    const { data: evals } = moduleIds.length > 0
      ? await supabase.from('evaluations').select('*').in('module_id', moduleIds.length > 0 ? moduleIds : ['none']).order('created_at', { ascending: false })
      : { data: [] }

    const byCourse: Record<string, { courseName: string; evaluations: any[]; moduleName: string }[]> = {}
    for (const ev of evals ?? []) {
      const mod = (mods ?? []).find((m: any) => m.id === ev.module_id)
      const courseId = mod?.course_id || ''
      if (!byCourse[courseId]) byCourse[courseId] = []
      byCourse[courseId].push({ courseName: '', evaluations: [...(byCourse[courseId]?.find(g => g.moduleName === mod?.name)?.evaluations || []), ev], moduleName: mod?.name || '' })
    }

    const evalsByCourse: Record<string, any[]> = {}
    for (const ev of evals ?? []) {
      const mod = (mods ?? []).find((m: any) => m.id === ev.module_id)
      const courseId = mod?.course_id || ''
      if (!evalsByCourse[courseId]) evalsByCourse[courseId] = []
      evalsByCourse[courseId].push({ ...ev, moduleName: mod?.name || '' })
    }

    const courseNames: Record<string, string> = {}
    for (const e of enrollments ?? []) {
      courseNames[e.course_id] = (e as any).courses?.name || ''
    }

    const courseIdsWithEvals = Object.keys(evalsByCourse)

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Evaluaciones</h1>
        <p class="mt-1 text-sm text-zinc-500">${(evals ?? []).length} evaluaciones en ${courseIdsWithEvals.length} cursos</p>
      </div>

      ${courseIdsWithEvals.length === 0
        ? '<p class="text-sm text-zinc-500">No hay evaluaciones disponibles.</p>'
        : courseIdsWithEvals.map((cid) => `
          <div class="mb-8">
            <h2 class="mb-3 font-heading text-lg font-bold text-white">${escapeHtml(courseNames[cid] || 'Curso')}</h2>
            <div class="space-y-2">
              ${evalsByCourse[cid].map((ev: any) => `
                <a href="#/students/evaluations/${escapeHtml(ev.id)}"
                   class="glass glass-hover flex items-center justify-between rounded-xl p-4">
                  <div class="flex items-center gap-3">
                    ${Icon('clipboardList', 16)}
                    <div>
                      <span class="text-sm text-white">${escapeHtml(ev.title)}</span>
                      <span class="block text-xs text-zinc-500">${escapeHtml(ev.moduleName)}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-zinc-500">${ev.weight ? `Peso: ${ev.weight}%` : ''}</span>
                    ${Icon('arrowRight', 14)}
                  </div>
                </a>
              `).join('')}
            </div>
          </div>
        `).join('')
      }`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading evaluations:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar evaluaciones</p>'
  }
}
