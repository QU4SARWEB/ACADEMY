import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'

export function renderCoachStudentDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachStudentDetail(): void {
  const params = router.getParams()
  const id = params.id
  if (!id) return

  ;(async () => {
    try {
      const [{ data: profile }, { data: enrollData }, { data: courses }, { data: payments }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('enrollments').select('*, courses(name, slug, min_rank, display_order)').eq('profile_id', id).order('enrolled_at', { ascending: false }),
        supabase.from('courses').select('id, name, display_order, min_rank').eq('is_active', true).order('display_order'),
        supabase.from('payments').select('status, amount, enrollment_id').eq('profile_id', id),
      ])

      // Track recent student visit
      try {
        const raw = localStorage.getItem('recentStudents')
        const recent: { id: string; name: string; ts: number }[] = raw ? JSON.parse(raw) : []
        const name = profile?.display_name || profile?.full_name || profile?.email || 'Alumno'
        const existing = recent.findIndex((r: any) => r.id === id)
        if (existing !== -1) recent.splice(existing, 1)
        recent.push({ id, name, ts: Date.now() })
        localStorage.setItem('recentStudents', JSON.stringify(recent.slice(-20)))
      } catch {}

      if (!profile) {
        document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-400">Estudiante no encontrado.</p>'
        return
      }

      const enrollments = (enrollData ?? []) as any[]
      const paymentByEnroll = new Map<string, string>()
      for (const p of payments ?? []) {
        const key = p.enrollment_id || 'none'
        if (!paymentByEnroll.has(key)) {
          if (p.status === 'paid' || p.status === 'scholarship') paymentByEnroll.set(key, 'paid')
          else paymentByEnroll.set(key, p.status)
        }
      }

      const html = `
        ${Breadcrumb([
          { label: 'Estudiantes', href: '#/coaches/students' },
          { label: (profile as any).full_name || 'Detalle' },
        ])}
        <div class="mb-6 flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-2xl font-bold text-purple-400">
                ${(profile as any).avatar_url
                  ? `<img src="${escapeHtml((profile as any).avatar_url)}" alt="" class="h-full w-full object-cover" />`
                  : escapeHtml((profile as any).full_name?.charAt(0) || '?')
                }
              </div>
              <div>
                <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((profile as any).full_name)}</h1>
                <p class="text-sm text-zinc-400">${escapeHtml((profile as any).email)} · ${escapeHtml((profile as any).riot_id || 'Sin Riot ID')}</p>
                <p class="text-sm text-zinc-500">Rango: ${escapeHtml((profile as any).rank)} · ${escapeHtml((profile as any).country || 'País no especificado')}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button id="btn-toggle-active" class="rounded-lg border px-4 py-2 text-sm transition ${(profile as any).is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}">
                ${(profile as any).is_active ? 'Desactivar' : 'Activar'}
              </button>
              ${!(profile as any).is_active ? '<button id="btn-hard-delete" class="rounded-lg border border-red-700 px-4 py-2 text-sm text-red-400 transition hover:bg-red-900/30">' + Icon('trash', 14) + ' Eliminar permanentemente</button>' : ''}
              <button id="btn-toggle-scholarship" class="flex items-center gap-2 rounded-lg border border-yellow-500/30 px-4 py-2 text-sm text-yellow-400 transition hover:bg-yellow-500/10">
                ${Icon('trophy', 14)}
                ${(profile as any).scholarship ? 'Quitar beca' : 'Dar beca'}
              </button>

            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 class="mb-4 font-heading text-lg font-bold text-white">Inscripciones</h2>
              <div class="space-y-3" id="enrollments-list">
                ${enrollments.length === 0 ? '<p class="text-sm text-zinc-500">Sin inscripciones.</p>' : ''}
                ${enrollments.map((enr: any) => {
                  const payStat = paymentByEnroll.get(enr.id)
                  const paymentStatus = payStat === 'paid' || payStat === 'scholarship' ? 'paid' : payStat || null
                  const statusColor = enr.status === 'active' ? 'text-green-400' : enr.status === 'recovery' ? 'text-yellow-400' : 'text-zinc-400'
                  return `
                    <div class="rounded-lg border border-zinc-800 bg-[#111] p-4" data-enrollment-id="${escapeHtml(enr.id)}">
                      <div class="flex items-start justify-between">
                        <div class="min-w-0 flex-1">
                          <p class="font-medium text-white">${escapeHtml(enr.courses?.name || '')}</p>
                          <p class="text-xs text-zinc-500">${escapeHtml(enr.type || '')}</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <a href="#/coaches/courses/${escapeHtml(enr.course_id)}/classes" class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 transition">${Icon('bookOpen', 10)} Clases</a>
                          </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                          <p class="text-sm capitalize ${statusColor}">
                            ${escapeHtml(enr.status)}${enr.promoted ? ' · Promocionado' : ''}
                          </p>

                          <div class="mt-1">
                            ${paymentStatus
                              ? `<span class="inline-block rounded-full px-2 py-0.5 text-xs ${paymentStatus === 'paid' || paymentStatus === 'free' ? 'bg-green-500/20 text-green-400' : paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${paymentStatus === 'paid' ? 'Pagado' : paymentStatus === 'free' ? 'Gratis' : escapeHtml(paymentStatus)}</span>`
                              : '<span class="text-xs text-zinc-600">Sin pago</span>'
                            }
                          </div>
                        </div>
                        <button class="btn-unenroll text-xs shrink-0 ml-2 ${enr.status === 'active' || enr.status === 'recovery' ? 'text-red-400 hover:text-red-300' : 'text-zinc-600 hover:text-red-400'}" data-enrollment-id="${escapeHtml(enr.id)}" data-status="${escapeHtml(enr.status)}">
                          ${Icon('trash', 14)}
                        </button>
                      </div>
                    </div>`
                }).join('')}
              </div>


            </div>

            <div>

              <div class="mt-4 rounded-lg border border-zinc-800 bg-[#111] p-4">
                <h3 class="mb-2 text-sm font-medium text-zinc-300">Información adicional</h3>
                <div class="space-y-1 text-sm text-zinc-500">
                  <p>Bio: ${escBr((profile as any).bio || 'Sin biografía')}</p>
                  <p>Redes: ${[(profile as any).social_discord, (profile as any).social_twitter, (profile as any).social_youtube].filter(Boolean).join(', ') || 'Ninguna'}</p>
                  <p>Email institucional: ${escapeHtml((profile as any).institutional_email || 'No generado')}</p>
                  <p>Beca: ${(profile as any).scholarship ? 'Sí (completa)' : 'No'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>`

      document.getElementById('page-content')!.innerHTML = html
      attachEventListeners(id, (profile as any).is_active, (profile as any).scholarship)
    } catch (err) {
      console.error('Error loading student detail:', err)
      document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar estudiante</p>'
    }
  })()
}

function attachEventListeners(studentId: string, isActive: boolean, hasScholarship: boolean): void {
  document.getElementById('btn-toggle-active')?.addEventListener('click', async () => {
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', studentId)
    if (error) toast('error', error.message)
    else mountCoachStudentDetail()
  })

  document.getElementById('btn-toggle-scholarship')?.addEventListener('click', async () => {
    const newVal = !hasScholarship
    const { error } = await supabase.from('profiles').update({ scholarship: newVal }).eq('id', studentId)
    if (error) { toast('error', error.message); return }
    if (newVal) {
      await supabase.from('payments').update({ status: 'scholarship' }).eq('profile_id', studentId).eq('status', 'pending')
    } else {
      await supabase.from('payments').update({ status: 'pending' }).eq('profile_id', studentId).eq('status', 'scholarship')
    }
    mountCoachStudentDetail()
  })

  document.getElementById('btn-hard-delete')?.addEventListener('click', async () => {
    if (!await confirmDialog('¿Eliminar PERMANENTEMENTE a este estudiante? Se borrarán todos sus datos. Esta acción NO se puede deshacer.', 'Eliminar permanentemente')) return
    await supabase.from('payments').delete().eq('profile_id', studentId)
    await supabase.from('enrollments').delete().eq('profile_id', studentId)
    await supabase.from('team_members').delete().eq('profile_id', studentId)
    const { error } = await supabase.from('profiles').delete().eq('id', studentId)
    if (error) { toast('error', error.message); return }
    toast('success', 'Estudiante eliminado permanentemente')
    window.location.hash = '#/coaches/students'
  })


  document.querySelectorAll('.btn-unenroll').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const enrollmentId = (btn as HTMLElement).dataset.enrollmentId
      const enrollmentStatus = (btn as HTMLElement).dataset.status || ''
      if (!enrollmentId) return
      const isInactive = enrollmentStatus === 'inactive'
      if (!await confirmDialog(isInactive ? '¿Eliminar permanentemente esta inscripción inactiva?' : '¿Dar de baja esta inscripción?')) return
      try {
        const { error } = isInactive
          ? await supabase.from('enrollments').delete().eq('id', enrollmentId)
          : await supabase.from('enrollments').update({ status: 'inactive' }).eq('id', enrollmentId)
        if (error) { toast('error', error.message); return }
        window.location.reload()
      } catch (err: any) { toast('error', err?.message || 'Error al eliminar'); console.error(err) }
    })
  })

}
