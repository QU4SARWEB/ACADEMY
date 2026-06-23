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
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado.</p>'
      return
    }

    let paymentStatus: string | null = null
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', session.user.id)
      .eq('course_id', id)
      .eq('status', 'active')
      .maybeSingle()
    if (enrollment) {
      const { data: payment } = await supabase
        .from('payments')
        .select('status, amount')
        .eq('enrollment_id', enrollment.id)
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
      : course.slug === 'clase-complementaria'
      ? `<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <strong>IMPORTANTE:</strong> Está estrictamente prohibido compartir el material, documentos, videos o cualquier información de este curso con alumnos que no hayan cancelado su inscripción. Si llegamos a detectar o se reporta que has compartido contenido, se aplicarán sanciones severas que pueden incluir la expulsión definitiva de la academia. <strong>Protege tu inversión y la de tus compañeros.</strong>
        </div>`
      : course.price && course.price > 0 ? ''
        : `<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
            Curso gratuito. ¡Disfruta del curso!
          </div>`

    const { data: examList } = await supabase
      .from('exams')
      .select('id, title')
      .eq('course_id', id)
      .eq('is_published', true)
      .order('created_at')

    const html = `
      <div>
        ${Breadcrumb([
          { label: 'Cursos', href: '#/students/courses' },
          { label: course.name },
        ])}
        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(course.name)}</h1>
          <p class="mt-1 text-sm text-zinc-400">
            ${course.duration_months} meses · Rango mínimo: ${escapeHtml(course.min_rank)}${course.price && course.price > 0 ? ` · $${course.price}/mes` : ' · Gratis'}
          </p>
          ${course.description ? `<p class="mt-2 text-sm text-zinc-300">${escBr(course.description)}</p>` : ''}
        </div>

        ${statusBadge}

        <div class="mb-6 flex gap-3">
          <a href="#/students/courses/${escapeHtml(id)}/exams"
             class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6]/20 px-3 py-1.5 text-sm text-[#8B5CF6] transition hover:bg-[#8B5CF6]/30">
            ${Icon('scrollText', 14)} Exámenes (${examList?.length ?? 0})
          </a>
          <a href="#/payments"
             class="btn-glow-sm flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-500/30">
            ${Icon('dollarSign', 14)} Pagos
          </a>
        </div>

        ${(examList ?? []).length > 0 ? `
        <div class="glass rounded-xl p-5">
          <h2 class="mb-3 font-heading text-base font-bold text-white">Exámenes disponibles</h2>
          <div class="space-y-2">
            ${(examList ?? []).map((ex: any) => `
              <a href="#/students/courses/${escapeHtml(id)}/exams/${escapeHtml(ex.id)}"
                 class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800/50">
                ${Icon('scrollText', 14)}
                <span>${escapeHtml(ex.title)}</span>
                ${Icon('arrowRight', 14)}
              </a>
            `).join('')}
          </div>
        </div>` : ''}

        <div class="mt-6">
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Clases</h2>
          <div id="classes-list-student" class="space-y-3">
            <p class="text-sm text-zinc-500">Cargando clases...</p>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    // ── Load classes ──
    const { data: classes } = await supabase.from('course_classes').select('*').eq('course_id', id).order('week_number', { ascending: true }).order('created_at', { ascending: true })
    const list = document.getElementById('classes-list-student')
    if (list) {
      if (!classes || classes.length === 0) {
        list.innerHTML = '<p class="text-sm text-zinc-500">No hay clases en este curso.</p>'
      } else {
        const iconMap: Record<string, string> = { pdf: 'fileText', video: 'video', image: 'image', link: 'link', file: 'paperclip' }
        list.innerHTML = classes.map(c => {
          const mats = typeof c.materials === 'string' ? (() => { try { return JSON.parse(c.materials) } catch { return [] } })() : (c.materials || [])
          return `<div class="glass rounded-xl p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6]">${c.week_number}</span>
                  <h3 class="font-heading text-base font-bold text-white">${escapeHtml(c.title)}</h3>
                </div>
                ${c.objectives ? `<div class="mb-3 text-sm text-zinc-400">${escapeHtml(c.objectives)}</div>` : ''}
                ${mats.length > 0 ? `<div class="flex flex-wrap gap-2">${mats.map((m: any) => `<a href="${escapeHtml(m.url)}" target="_blank" class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition">${Icon(iconMap[m.type] || 'paperclip', 12)} ${escapeHtml(m.name || m.url)}</a>`).join('')}</div>` : ''}
              </div>
            </div>
          </div>`
        }).join('')
      }
    }
  } catch (err) {
    console.error('Error loading course detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
  }
}
