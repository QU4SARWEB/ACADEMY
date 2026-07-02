import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'
import { autoEnrollComplementaria } from '@/2b3583/course_utils'

export function renderCoachPlayerDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachPlayerDetail(): Promise<void> {
  const params = router.getParams()
  const id = params.id
  if (!id) return

  try {
    const [{ data: profile }, { data: courses }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('courses').select('id, name, display_order, price').eq('is_active', true).order('display_order'),
    ])
    if (!profile) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-400">Jugador no encontrado.</p>'
      return
    }

     const [{ data: payments }, { data: teamMembers }, { data: scrims }, { data: enrollments }] = await Promise.all([
      supabase.from('payments').select('status, amount, enrollment_id, created_at').eq('profile_id', id).order('created_at', { ascending: false }),
      supabase.from('team_members').select('*, teams(name, id, logo_url, color)').eq('profile_id', id),
      supabase.from('scrims').select('*, team:team_id(name)').eq('opponent_id', id).order('date', { ascending: false }),
      supabase.from('enrollments').select('*, courses(name)').eq('profile_id', id).order('enrolled_at', { ascending: false }),
    ])

    const enrolledCourseIds = (enrollments ?? []).map((e: any) => e.course_id)
    const hasPaidAny = (payments ?? []).some((p: any) => (p.status === 'paid' || p.status === 'scholarship') && p.enrollment_id)
    const available = (courses ?? []).filter((c: any) => !enrolledCourseIds.includes(c.id) && (c.id !== 'aea1376e-95d2-4dec-a4ef-07b2395e8f78' || hasPaidAny))

    const priceMap: Record<string, number> = {}
    for (const c of courses ?? []) priceMap[c.id] = parseFloat(c.price ?? 0)

    const displayName = [profile.riot_id || profile.full_name, profile.social_discord].filter(Boolean).join(' | ') || profile.full_name || 'Unknown'
    const initial = (displayName || '?')[0]
    const activeEnrollments = (enrollments ?? []).filter((e: any) => e.status === 'active')
    const hasPaidEnroll = activeEnrollments.some((e: any) => (payments ?? []).some((p: any) => p.enrollment_id === e.id && (p.status === 'paid' || p.status === 'scholarship')))
    const allFree = !hasPaidEnroll && activeEnrollments.every((e: any) => (priceMap[e.course_id] || 0) === 0 || (payments ?? []).some((p: any) => p.enrollment_id === e.id && p.status === 'free'))
    const payStatus = activeEnrollments.length > 0 ? (hasPaidEnroll ? 'pagado' : allFree ? 'gratis' : 'pendiente') : 'sin curso'

    const html = `
      ${Breadcrumb([
        { label: 'Jugadores', href: '#/coaches/players' },
        { label: profile.full_name || 'Detalle' },
      ])}
      <div class="mb-6 flex items-start justify-between">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-2xl font-bold text-purple-400">
            ${profile.avatar_url
              ? `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="h-full w-full object-cover" />`
              : escapeHtml(initial)}
          </div>
          <div>
            <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(displayName)}</h1>
            <p class="text-sm text-zinc-400">${profile.rank || 'Sin rango'}${profile.email ? ` · ${escapeHtml(profile.email)}` : ''}</p>
            <div class="flex gap-2 mt-1">
              <span class="rounded-full px-2 py-0.5 text-xs ${profile.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${profile.is_active ? 'Activo' : 'Inactivo'}</span>
              ${profile.scholarship ? '<span class="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Becado</span>' : ''}
              <span class="rounded-full px-2 py-0.5 text-xs ${payStatus === 'pagado' || payStatus === 'gratis' ? 'bg-green-500/20 text-green-400' : payStatus === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-700 text-zinc-400'}">${payStatus === 'gratis' ? 'Gratis' : payStatus}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="toggle-active-btn" class="rounded-lg border ${profile.is_active ? 'border-red-700 text-red-400 hover:bg-red-900/30' : 'border-green-700 text-green-400 hover:bg-green-900/30'} px-3 py-2 text-sm transition">${profile.is_active ? Icon('x', 14) + ' Desactivar' : Icon('checkCircle', 14) + ' Activar'}</button>
          <button id="toggle-scholarship-btn" class="rounded-lg border ${profile.scholarship ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'} px-3 py-2 text-sm transition">${profile.scholarship ? Icon('x', 14) + ' Quitar beca' : Icon('dollarSign', 14) + ' Dar beca'}</button>
          <button id="delete-player-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)} Eliminar</button>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="glass rounded-xl p-5">
          <h2 class="font-heading text-base font-bold text-white mb-3">Información</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-zinc-400">Riot ID</span><span class="text-white">${escapeHtml(profile.riot_id || '-')}</span></div>
            <div class="flex justify-between"><span class="text-zinc-400">Discord</span><span class="text-white">${escapeHtml(profile.social_discord || '-')}</span></div>
            <div class="flex justify-between"><span class="text-zinc-400">Email</span><span class="text-white">${escapeHtml(profile.email || '-')}</span></div>
            <div class="flex justify-between"><span class="text-zinc-400">Rango</span><span class="text-white">${escapeHtml(profile.rank || '-')}</span></div>
            <div class="flex justify-between"><span class="text-zinc-400">Registro</span><span class="text-white">${profile.created_at ? formatDate(profile.created_at) : '-'}</span></div>
          </div>
        </div>

        <div class="glass rounded-xl p-5">
          <h2 class="font-heading text-base font-bold text-white mb-3">Equipo</h2>
          ${!teamMembers || teamMembers.length === 0
            ? '<p class="text-sm text-zinc-500">No pertenece a ningún equipo.</p>'
            : `<div class="space-y-3">${teamMembers.map((tm: any) => `
              <div class="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
                ${tm.teams?.logo_url
                  ? `<img src="${escapeHtml(tm.teams.logo_url)}" alt="" class="h-10 w-10 rounded-lg object-cover" />`
                  : `<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background:${tm.teams?.color || '#8B5CF6'}20;color:${tm.teams?.color || '#8B5CF6'}">${Icon('users', 16)}</div>`
                }
                <div>
                  <p class="text-sm font-medium text-white" style="color:${tm.teams?.color || '#fff'}">${escapeHtml(tm.teams?.name || 'Sin nombre')}</p>
                  <p class="text-xs text-zinc-500">${escapeHtml(tm.role || 'Miembro')}</p>
                </div>
              </div>
            `).join('')}</div>`
          }
        </div>
      </div>

      <div class="glass rounded-xl p-5 mt-6">
        <h2 class="font-heading text-base font-bold text-white mb-3">Cursos (${activeEnrollments.length})</h2>
        ${activeEnrollments.length === 0
          ? '<p class="text-sm text-zinc-500">No inscrito en ningún curso.</p>'
          : `<div class="grid gap-3 sm:grid-cols-2">${activeEnrollments.map((e: any) => {
              const ePayments = (payments ?? []).filter((p: any) => p.enrollment_id === e.id)
              const isFreeCourse = (priceMap[e.course_id] || 0) === 0
              const eStatus = isFreeCourse ? 'gratis' : ePayments.some((p: any) => p.status === 'paid' || p.status === 'scholarship') ? 'pagado' : ePayments.some((p: any) => p.status === 'free') ? 'gratis' : ePayments.length > 0 ? 'pendiente' : 'sin pago'
              return `<div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white">${escapeHtml(e.courses?.name || '—')}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs ${eStatus === 'pagado' || eStatus === 'gratis' ? 'bg-green-500/20 text-green-400' : eStatus === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-700 text-zinc-400'}">${eStatus === 'gratis' ? 'Gratuito' : eStatus}</span>
                </div>
                <p class="text-xs text-zinc-500 mt-1">${escapeHtml(e.type || 'player')} · ${escapeHtml(e.status)}</p>
              </div>`
            }).join('')}</div>`
        }
      </div>

      <div class="mt-6 rounded-lg border border-zinc-800 bg-[#111] p-4">
        <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
          ${Icon('bookOpen', 14)} Inscribir en curso
        </h3>
        <form id="form-enroll" class="mt-3 space-y-3">
          <input type="hidden" name="profileId" value="${escapeHtml(id)}" />
          <div>
            <input type="hidden" name="courseId" id="enroll-course-id" value="" />
            <div class="flex flex-wrap gap-2" id="enroll-course-grid">
              ${available.length === 0 ? '<p class="text-xs text-zinc-500">Ya está inscrito en todos los cursos.</p>' : available.map((c: any) => `
                <button type="button" class="enroll-course-btn rounded-xl border px-4 py-2 text-sm text-zinc-300 transition hover:border-[#8B5CF6] hover:text-white border-zinc-700 bg-zinc-900/50"
                  data-course-id="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>
              `).join('')}
            </div>
          </div>
          <div class="flex gap-2">
            <select name="type" class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="player">Jugador</option>
              <option value="student">Alumno</option>
            </select>
          </div>
          <p id="enroll-error" class="hidden text-xs text-red-400"></p>
          <button type="submit" class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            ${Icon('plus', 14)} Inscribir
          </button>
        </form>
      </div>

      <div class="glass rounded-xl p-5 mt-6">
        <h2 class="font-heading text-base font-bold text-white mb-3">Historial de pagos</h2>
        ${!payments || payments.length === 0
          ? '<p class="text-sm text-zinc-500">Sin pagos registrados.</p>'
          : `<div class="space-y-2">${payments.map((p: any) => `
            <div class="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3">
              <span class="text-sm text-zinc-300">${p.amount ? '$' + p.amount : '—'}</span>
              <span class="rounded-full px-2 py-0.5 text-xs ${p.status === 'paid' || p.status === 'free' ? 'bg-green-500/20 text-green-400' : p.status === 'scholarship' ? 'bg-yellow-500/20 text-yellow-400' : p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-red-500/20 text-red-400'}">${p.status === 'paid' ? 'Pagado' : p.status === 'free' ? 'Gratis' : p.status === 'scholarship' ? 'Beca' : p.status === 'pending' ? 'Pendiente' : p.status === 'expired' ? 'Vencido' : p.status}</span>
              <span class="text-xs text-zinc-500">${p.created_at ? formatDate(p.created_at) : ''}</span>
            </div>
          `).join('')}</div>`
        }
      </div>

      <div class="glass rounded-xl p-5 mt-6">
        <h2 class="font-heading text-base font-bold text-white mb-3">Enfrentamientos recientes</h2>
        ${!scrims || scrims.length === 0
          ? '<p class="text-sm text-zinc-500">Sin scrims registrados.</p>'
          : `<div class="space-y-2">${scrims.slice(0, 10).map((s: any) => `
            <div class="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3">
              <span class="text-sm text-zinc-300">vs ${escapeHtml(s.opponent || '—')}</span>
              <span class="text-xs ${s.result === 'win' ? 'text-green-400' : s.result === 'loss' ? 'text-red-400' : 'text-zinc-500'}">${s.result || '—'}</span>
              <span class="text-xs text-zinc-500">${s.date ? formatDate(s.date) : ''}</span>
            </div>
          `).join('')}</div>`
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('toggle-active-btn')?.addEventListener('click', async () => {
      const newVal = !profile.is_active
      if (!(await confirmDialog(`${newVal ? 'Activar' : 'Desactivar'} este jugador?`))) return
      const { error } = await supabase.from('profiles').update({ is_active: newVal }).eq('id', id)
      if (error) { toast('error', error.message); return }
      toast('success', `Jugador ${newVal ? 'activado' : 'desactivado'}`)
      window.location.reload()
    })

    document.getElementById('toggle-scholarship-btn')?.addEventListener('click', async () => {
      const newVal = !profile.scholarship
      if (!(await confirmDialog(`${newVal ? 'Dar' : 'Quitar'} beca a este jugador?`))) return
      await supabase.from('profiles').update({ scholarship: newVal }).eq('id', id)
      if (newVal) {
        await supabase.from('payments').update({ status: 'scholarship' }).eq('profile_id', id).eq('status', 'pending')
      } else {
        await supabase.from('payments').update({ status: 'pending' }).eq('profile_id', id).eq('status', 'scholarship')
      }
      toast('success', `Beca ${newVal ? 'asignada' : 'quitada'}`)
      window.location.reload()
    })

    document.getElementById('delete-player-btn')?.addEventListener('click', async () => {
      if (!(await confirmDialog('¿Desactivar permanentemente este jugador?'))) return
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
      if (error) { toast('error', error.message); return }
      toast('success', 'Jugador desactivado')
      window.location.reload()
    })

    // Enroll course buttons
    document.querySelectorAll('.enroll-course-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.enroll-course-btn').forEach(b => {
          b.classList.remove('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
          b.classList.add('border-zinc-700', 'text-zinc-300')
        })
        btn.classList.add('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
        btn.classList.remove('border-zinc-700', 'text-zinc-300')
        document.getElementById('enroll-course-id')!.setAttribute('value', (btn as HTMLElement).dataset.courseId || '')
      })
    })

    document.getElementById('form-enroll')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const profileId = fd.get('profileId') as string
      const courseId = fd.get('courseId') as string
      const type = (fd.get('type') as string) || 'player'

      if (!courseId) {
        document.getElementById('enroll-error')!.textContent = 'Selecciona un curso'
        document.getElementById('enroll-error')!.classList.remove('hidden')
        return
      }

      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('profile_id', profileId)
        .eq('course_id', courseId)
        .maybeSingle()

      if (existing) {
        document.getElementById('enroll-error')!.textContent = 'Ya está inscrito en este curso'
        document.getElementById('enroll-error')!.classList.remove('hidden')
        return
      }

      const { data: newEnroll, error: enrError } = await supabase.from('enrollments').insert({
        profile_id: profileId,
        course_id: courseId,
        type,
        status: 'active',
      }).select('id').maybeSingle()

      if (enrError || !newEnroll) {
        document.getElementById('enroll-error')!.textContent = enrError?.message || 'Error al crear inscripción'
        document.getElementById('enroll-error')!.classList.remove('hidden')
        return
      }

      const { data: enrollCourse } = await supabase.from('courses').select('price').eq('id', courseId).maybeSingle()
      const coursePrice = enrollCourse?.price != null ? parseFloat(enrollCourse.price) : 1.54
      const { data: playerProfile } = await supabase
        .from('profiles')
        .select('scholarship')
        .eq('id', profileId)
        .maybeSingle()

      const payStatus = coursePrice === 0 ? 'free' : (playerProfile?.scholarship ? 'scholarship' : 'pending')
      const { error: payErr } = await supabase.from('payments').insert({
        profile_id: profileId,
        enrollment_id: newEnroll.id,
        type,
        status: payStatus,
        amount: coursePrice,
      })
      if (payErr) {
        console.error('Error creating payment:', payErr, { profileId, enrollmentId: newEnroll.id, type, payStatus, coursePrice })
        toast('error', 'Error al crear pago: ' + payErr.message + ' (código: ' + payErr.code + ')')
        return
      }
      toast('success', 'Pago creado (' + payStatus + ')')
      if (payStatus === 'scholarship' && coursePrice > 0) autoEnrollComplementaria(profileId, type)

      toast('success', 'Jugador inscrito correctamente')
      window.location.reload()
    })
  } catch (err) {
    console.error('Error loading player detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar datos del jugador</p>'
  }
}
