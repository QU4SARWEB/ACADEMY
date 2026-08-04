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
      <!-- Encabezado -->
      <div class="mb-8">
        <div class="section-head mb-0">
          <span class="kicker">Tu progreso académico</span>
          <h1>Bienvenido, ${escapeHtml(userName)}</h1>
          <p>Todo lo que necesitas para avanzar, en un solo lugar.</p>
        </div>
      </div>

      ${payStatusHtml}

      <!-- KPIs -->
      <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="kpi-card">
          <div class="flex items-center gap-4">
            <div class="kpi-icon" style="background:#8B5CF620">
              <span style="color:#8B5CF6">${Icon('bookOpen', 20)}</span>
            </div>
            <div>
              <p class="kpi-value">${(enrollments ?? []).length}</p>
              <p class="kpi-label">Cursos activos</p>
            </div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="flex items-center gap-4">
            <div class="kpi-icon" style="background:#7C3AED20">
              <span style="color:#7C3AED">${Icon('scrollText', 20)}</span>
            </div>
            <div>
              <p class="kpi-value">${(enrollments ?? []).filter((e: any) => (e as any).current_module > 0).length || (enrollments ?? []).length}</p>
              <p class="kpi-label">En entrenamiento</p>
            </div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="flex items-center gap-4">
            <div class="kpi-icon" style="background:#22C55E20">
              <span style="color:#22C55E">${Icon('trophy', 20)}</span>
            </div>
            <div>
              <p class="kpi-value">${(courseProgress ?? []).filter((e: any) => (e as any).progress >= 100).length}</p>
              <p class="kpi-label">Cursos completados</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">

        <!-- Progreso por curso -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <h2 class="font-heading text-base font-bold text-white">Progreso por curso</h2>
            <a href="#/students/courses" class="ml-auto text-xs text-[#8B5CF6] hover:underline">Ver cursos →</a>
          </div>
          <div class="space-y-4">
            ${(courseProgress ?? []).length === 0
              ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>'
              : courseProgress.map((e: any) => `
              <div class="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="min-w-0">
                    <h3 class="truncate font-medium text-white">${escapeHtml(e.courses?.name || 'Curso')}</h3>
                    <p class="text-xs text-zinc-500">${escapeHtml(e.seasons?.name || 'Programa de entrenamiento')}</p>
                  </div>
                  <span class="ml-2 shrink-0 text-sm font-bold" style="color:${(e as any).progress >= 100 ? '#22C55E' : '#8B5CF6'}">${e.progress}%</span>
                </div>
                <div class="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700" style="width:${e.progress}%;background:linear-gradient(90deg,#8B5CF6,#7C3AED)"></div>
                </div>
                <p class="mt-1.5 text-xs text-zinc-600">Módulo ${e.current_module || 1} de ${e.totalModules || '—'}</p>
              </div>
            `).join('')
            }
          </div>
        </div>

        <!-- Acceso rápido -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <h2 class="font-heading text-base font-bold text-white">Acceso rápido</h2>
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${[
              { href: '#/students/courses', icon: 'bookOpen', label: 'Mis cursos', color: '#8B5CF6' },
              { href: '#/students/tasks', icon: 'clipboardList', label: 'Tareas', color: '#7C3AED' },
              { href: '#/students/exams', icon: 'scrollText', label: 'Exámenes', color: '#F59E0B' },
              { href: '#/students/grades', icon: 'trophy', label: 'Mis notas', color: '#22C55E' },
              { href: '#/students/schedule', icon: 'calendar', label: 'Horario', color: '#3B82F6' },
              { href: '#/payments', icon: 'dollarSign', label: 'Pagos', color: '#EC4899' },
            ].map((q, i) => `
              <a href="${q.href}" class="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 transition hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5" style="--i:${i}">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style="background:${q.color}20;color:${q.color}">${Icon(q.icon, 18)}</span>
                <span class="text-sm text-white">${escapeHtml(q.label)}</span>
              </a>
            `).join('')}
          </div>

          <div class="mt-6 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 p-4">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6]">${Icon('zap', 18)}</span>
              <div>
                <p class="text-sm font-medium text-white">Consejo del día</p>
                <p class="mt-0.5 text-xs text-zinc-400">Entrena con constancia: 30 minutos enfocados valen más que 3 horas distraído.</p>
              </div>
            </div>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading student dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
