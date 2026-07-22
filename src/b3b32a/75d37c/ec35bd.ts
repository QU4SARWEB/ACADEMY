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
    let paidAt: string | null = null
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
        .select('status, amount, paid_at')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false })
        .maybeSingle()
      if (payment) { paymentStatus = payment.status; paidAt = payment.paid_at }
    }

    let paidDaysLeft = ''
    if (paidAt) {
      const elapsed = Date.now() - new Date(paidAt).getTime()
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 86400000))
      paidDaysLeft = remaining > 0 ? ` — ${remaining} día${remaining !== 1 ? 's' : ''} restantes` : ' — vencida'
    }

    const statusBadge = paymentStatus === 'pending'
      ? `<div class="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          Pago pendiente — <a href="#/payments" class="underline hover:text-yellow-300">Sube tu comprobante aquí</a>
        </div>`
      : paymentStatus === 'paid'
      ? `<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          Pago confirmado${paidDaysLeft}
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
          <a href="#/payments"
             class="btn-glow-sm flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-500/30">
            ${Icon('dollarSign', 14)} Pagos
          </a>
        </div>

      </div>`

    document.getElementById('page-content')!.innerHTML = html


  } catch (err) {
    console.error('Error loading course detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
  }
}
