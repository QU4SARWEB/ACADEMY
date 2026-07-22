import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderStudentDashboard(): string {
  return `<div id="page-content">
    <div class="mb-6">${LoadingSkeleton('list', 1)}</div>
    <div class="mb-8">${LoadingSkeleton('card', 1)}</div>
    <div>${LoadingSkeleton('card', 3)}</div>
  </div>`
}

export async function initStudentDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', session.user.id)
      .maybeSingle()

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name, id)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    const courseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)

    let payStatusHtml = ''
    const { data: myPayments } = await supabase.from('payments').select('status, paid_at, created_at').eq('profile_id', session.user.id).order('created_at', { ascending: false })
    const paidPay = (myPayments ?? []).find((p: any) => p.status === 'paid')
    const pendingPay = (myPayments ?? []).find((p: any) => p.status === 'pending')
    if (paidPay?.paid_at) {
      const elapsed = Date.now() - new Date(paidPay.paid_at).getTime()
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 86400000))
      payStatusHtml = remaining > 0
        ? `<div class="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400 mb-6">Suscripción activa — ${remaining} día${remaining !== 1 ? 's' : ''} restantes</div>`
        : `<div class="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 mb-6">Suscripción vencida — <a href="#/payments" class="underline hover:text-red-300">renueva aquí</a></div>`
    } else if (pendingPay?.created_at) {
      const expiresAt = new Date(pendingPay.created_at).getTime() + 172800000
      const diff = expiresAt - Date.now()
      if (diff > 0) {
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        payStatusHtml = `<div class="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-400 mb-6">Pago pendiente — vence en ${h}h ${m}m — <a href="#/payments" class="underline hover:text-yellow-300">pagar ahora</a></div>`
      } else {
        payStatusHtml = `<div class="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 mb-6">Pago vencido — <a href="#/payments" class="underline hover:text-red-300">regulariza aquí</a></div>`
      }
    }

    const courseProgress = (enrollments ?? []).map((e: any) => ({ ...e, progress: 0, totalModules: 0 }))

    const userName = profile?.display_name || profile?.full_name || 'Estudiante'

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Tu progreso académico</p>
      </div>

      ${payStatusHtml}

      <div class="mb-8">
        <div class="glass inline-block rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-white">${(enrollments ?? []).length}</p>
          <p class="text-xs text-zinc-500">Cursos activos</p>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Progreso por curso</h2>
        <div class="space-y-4">
          ${(courseProgress ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>'
            : courseProgress.map((e: any) => `
              <div class="glass rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Curso')}</h3>
                    <p class="text-xs text-zinc-500">${escapeHtml(e.seasons?.name || '')}</p>
                  </div>
                  <span class="text-sm font-bold text-white">${e.progress}%</span>
                </div>
                <div class="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-[#8B5CF6] transition-all duration-700" style="width:${e.progress}%"></div>
                </div>
                <p class="mt-1 text-xs text-zinc-600">Módulo ${e.current_module || 1} de ${e.totalModules}</p>
              </div>
            `).join('')
          }
        </div>
      </div>

      <div>
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Acceso rápido</h2>
        <div class="grid grid-cols-2 gap-3">
          <a href="#/students/courses" class="glass flex items-center gap-3 rounded-xl p-4 hover:bg-zinc-800/50 transition">
            ${Icon('bookOpen', 20)} <span class="text-sm text-white">Mis cursos</span>
          </a>

          <a href="#/payments" class="glass flex items-center gap-3 rounded-xl p-4 hover:bg-zinc-800/50 transition">
            ${Icon('dollarSign', 20)} <span class="text-sm text-white">Pagos</span>
          </a>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading student dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
