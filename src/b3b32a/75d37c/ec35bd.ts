import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'

export function renderStudentCourseDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentCourseDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: course } = await supabase
      .from('courses')
      .select('*, seasons(name)')
      .eq('id', id)
      .maybeSingle()
    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado.</p>'
      return
    }

    const { data: mods } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', id)
      .order('display_order')
    const modList = mods ?? []

    const moduleIds = modList.map((m: any) => m.id)
    const { data: mats } = await supabase
      .from('materials')
      .select('*')
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
      .order('display_order')

    const byModule: Record<string, any[]> = {}
    for (const mat of mats ?? []) {
      if (!byModule[mat.module_id]) byModule[mat.module_id] = []
      byModule[mat.module_id]!.push(mat)
    }

    let paymentStatus = 'pending'
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('season_id')
      .eq('profile_id', session.user.id)
      .eq('course_id', id)
      .eq('status', 'active')
      .maybeSingle()
    if (enrollment) {
      const { data: payment } = await supabase
        .from('payments')
        .select('status')
        .eq('profile_id', session.user.id)
        .eq('season_id', enrollment.season_id)
        .order('created_at', { ascending: false })
        .maybeSingle()
      if (payment) paymentStatus = payment.status
    }

    const statusBadge = paymentStatus === 'pending'
      ? `<div class="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          Pago pendiente — <a href="#/payments" class="underline hover:text-yellow-300">Sube tu comprobante aquí</a>
        </div>`
      : paymentStatus === 'paid'
      ? `<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          Pago confirmado. ¡Disfruta del curso!
        </div>`
      : paymentStatus === 'scholarship'
      ? `<div class="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-400">
          Este curso está cubierto por una beca.
        </div>`
      : ''

    const html = `
      <div>
        ${Breadcrumb([
          { label: 'Cursos', href: '#/students/courses' },
          { label: course.name },
        ])}
        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(course.name)}</h1>
          <p class="mt-1 text-sm text-zinc-400">
            ${escapeHtml(course.seasons?.name || '')} · ${course.duration_months} meses · Rango mínimo: ${escapeHtml(course.min_rank)}
          </p>
          ${course.description ? `<p class="mt-2 text-sm text-zinc-300">${escBr(course.description)}</p>` : ''}
        </div>

        ${statusBadge}

        <div class="mb-6 flex gap-3">
          <a href="#/students/courses/${escapeHtml(id)}/exams"
             class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6]/20 px-3 py-1.5 text-sm text-[#8B5CF6] transition hover:bg-[#8B5CF6]/30">
            ${Icon('scrollText', 14)} Exámenes
          </a>
          <a href="#/payments"
             class="btn-glow-sm flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-500/30">
            ${Icon('dollarSign', 14)} Pagos
          </a>
        </div>

        <div class="space-y-4">
          ${modList.length === 0
            ? '<p class="text-sm text-zinc-500">No hay módulos disponibles todavía.</p>'
            : modList.map((mod: any) => {
                const materials = byModule[mod.id] ?? []
                return `
                  <div class="glass rounded-xl p-5">
                    <div class="mb-3 flex items-center gap-3">
                      ${Icon('bookOpen', 18)}
                      <div>
                        <h2 class="font-medium text-white">${escapeHtml(mod.name)}</h2>
                        <p class="text-xs text-zinc-500">Mes ${mod.month_number}</p>
                      </div>
                    </div>
                    ${materials.length > 0
                      ? `<div class="ml-8 space-y-2">
                          ${materials.map((mat: any) => `
                            <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-2.5">
                              ${mat.type === 'video' ? Icon('play', 14) : mat.type === 'link' ? Icon('externalLink', 14) : Icon('scrollText', 14)}
                              <span class="flex-1 text-sm text-zinc-300">${escapeHtml(mat.title)}</span>
                              ${mat.url
                                ? `<a href="${escapeHtml(mat.url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-[#8B5CF6] hover:underline">
                                    ${mat.type === 'link' ? 'Abrir' : 'Descargar'}
                                  </a>`
                                : ''
                              }
                            </div>
                          `).join('')}
                        </div>`
                      : '<p class="ml-8 text-sm text-zinc-600">Sin materiales todavía.</p>'
                    }
                  </div>`
              }).join('')
          }
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading course detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
  }
}
