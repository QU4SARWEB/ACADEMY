import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { store } from '@/9ed39e/8cd892'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { renderFileDropzone, initFileDropzone } from '@/4725dc/forms/FileDropzone'
import type { Profile } from '@/d14a80'

let selectedSeasonId: string | null = null

const PAYPAL_CLIENT_ID = 'ASjqwWQof0YKxBx4ZlQ03H4wQobDw3eytN-el650Yb3d0mjOcREb6FHHCEFd6UMd__jp_1yjBPPI76um'
const PAYPAL_SANDBOX = false // false = live, true = sandbox

export function renderPayments(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPayments(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const profile = store.get<Profile>('profile')

    if (profile?.role === 'coach') {
      await renderCoachPayments()
    } else {
      await renderStudentPayments(session.user.id)
    }
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar pagos</p>'
  }
}

async function renderStudentPayments(userId: string): Promise<void> {
  // Auto-expire pending payments older than 7 days
  const EXPIRE_MS = 2 * 24 * 60 * 60 * 1000
  const { data: pendingPays } = await supabase.from('payments').select('id, created_at').eq('profile_id', userId).eq('status', 'pending')
  for (const pp of pendingPays ?? []) {
    if (pp.created_at && Date.now() - new Date(pp.created_at).getTime() > EXPIRE_MS) {
      await supabase.from('payments').update({ status: 'expired' }).eq('id', pp.id)
    }
  }
  let { data: payments } = await supabase
    .from('payments')
    .select('*, seasons(name)')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  // Build a map of enrollment_id → course name
  const { data: allEnrolls } = await supabase
    .from('enrollments')
    .select('id, courses!course_id(name), status')
    .eq('profile_id', userId)
  const courseByEnroll: Record<string, string> = {}
  const activeEnrollIds = new Set<string>()
  for (const e of allEnrolls ?? []) {
    courseByEnroll[e.id] = (e as any).courses?.name || ''
    if ((e as any).status === 'active') activeEnrollIds.add(e.id)
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(name), seasons(name, id)')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  // Auto-create payments: one per course, but allow new if previous was failed
  const paidPassedCourses = new Set<string>()
  const enrollWithPayment = new Set<string>()
  for (const p of payments ?? []) {
    if (p.enrollment_id) enrollWithPayment.add(p.enrollment_id)
    const enr = allEnrolls?.find((x: any) => x.id === p.enrollment_id)
    if (enr) {
      const alreadyPassed = (enrollments ?? []).some((e2: any) => e2.course_id === (enr as any).course_id && e2.final_grade !== null && e2.final_grade >= 70 && e2.promoted)
      if (alreadyPassed) paidPassedCourses.add((enr as any).course_id)
    }
  }
  for (const e of enrollments ?? []) {
    const seasonId = e.seasons?.id ?? e.season_id
    if (seasonId && !paidPassedCourses.has(e.course_id) && !enrollWithPayment.has(e.id)) {
      const { data: profile } = await supabase.from('profiles').select('scholarship').eq('id', userId).maybeSingle()
      const { error: insErr } = await supabase.from('payments').insert({
        profile_id: userId,
        enrollment_id: e.id,
        season_id: seasonId,
        type: e.type || 'student',
        status: profile?.scholarship ? 'scholarship' : 'pending',
        amount: 1.54,
      })
      if (insErr && insErr.code === '23505') {
        // Duplicate - payment already exists for this enrollment, ignore
      } else if (insErr) {
        console.error('Error creating payment:', insErr)
      }
    }
  }

  // Re-fetch payments after auto-creating missing ones
  if ((payments ?? []).length === 0 && (enrollments ?? []).length > 0) {
    const { data: refreshed } = await supabase
      .from('payments')
      .select('*, seasons(name)')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
    if (refreshed) payments = refreshed
  }

  const statusColors: Record<string, string> = { pending: 'text-yellow-400', paid: 'text-green-400', scholarship: 'text-blue-400', expired: 'text-red-400' }
  const statusLabels: Record<string, string> = { pending: 'Debes', paid: 'Pagaste', scholarship: 'Cubierto por beca', expired: 'Vencido' }

  const html = `
    <div class="mb-6">
      <h1 class="font-heading text-2xl font-bold text-white">Pagos</h1>
      <p class="mt-1 text-sm text-zinc-500">Historial de pagos y facturación</p>
    </div>

    ${(enrollments ?? []).length > 0 ? `
      <div class="mb-8 space-y-3">
        <h2 class="font-heading text-lg font-bold text-white">Cursos activos</h2>
        ${(enrollments ?? []).map((e: any) => `
          <div class="glass rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Curso')}</h3>
              <p class="text-xs text-zinc-500">${escapeHtml(e.seasons?.name || '')}</p>
            </div>
            <span class="text-xs ${statusColors[e.type === 'student' ? 'paid' : 'pending']}">${e.type === 'student' ? 'Activo' : 'Pendiente'}</span>
          </div>
        `).join('')}
      </div>` : ''}

    <div class="space-y-3">
      <h2 class="font-heading text-lg font-bold text-white">Historial de pagos</h2>
      ${(() => {
        const visiblePayments = (payments ?? []).filter((p: any) => !p.enrollment_id || activeEnrollIds.has(p.enrollment_id))
        return visiblePayments.length === 0
          ? '<p class="text-sm text-zinc-500">No hay pagos registrados.</p>'
          : visiblePayments.map((p: any) => `
          <div class="payment-item glass rounded-xl p-4 space-y-3" data-payment-id="${escapeHtml(p.id)}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">${escapeHtml(courseByEnroll[p.enrollment_id] || p.seasons?.name || 'Pago')}</p>
              <p class="text-xs text-zinc-500">${p.paid_at ? 'Pagado: ' + formatDate(p.paid_at) : ''}</p>
            </div>
            ${p.status === 'scholarship'
              ? `<span class="shrink-0 text-sm font-medium text-blue-400">${statusLabels.scholarship}</span>`
              : `<span class="shrink-0 text-sm font-medium ${statusColors[p.status] || 'text-zinc-500'}">${statusLabels[p.status] || escapeHtml(p.status)} $${p.amount ?? 1.54}</span>`
            }
          </div>
          ${p.status === 'pending' && p.created_at ? `<span class="payment-countdown block text-xs mt-1" data-expires="${new Date(p.created_at).getTime() + 172800000}"></span>` : ''}
          ${p.status === 'pending' ? `
          <div class="flex flex-col gap-2">
            <div class="paypal-btn-container" data-paypal-id="${escapeHtml(p.id)}" data-amount="${p.amount ?? 1.54}"></div>
            <div class="flex items-center gap-2 text-xs text-zinc-400">
              <span class="text-zinc-600">O</span>
              ${p.receipt_url
                ? `<a href="${escapeHtml(p.receipt_url)}" target="_blank" class="text-[#8B5CF6] hover:underline">Ver comprobante</a>`
                : `<button class="upload-receipt-btn flex items-center gap-1 text-[#8B5CF6] hover:underline">${Icon('upload', 12)} Subir comprobante</button>`
              }
            </div>
          </div>` : ''}
          ${p.status === 'paid' && p.receipt_url ? `
          <div class="text-xs"><a href="${escapeHtml(p.receipt_url)}" target="_blank" class="text-[#8B5CF6] hover:underline">${Icon('fileText', 12)} Ver comprobante</a></div>` : ''}
        </div>
        `).join('')
      })()}
    </div>

    <div id="receipt-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Subir comprobante">
      <div class="glass max-w-md rounded-xl p-6">
        <h3 class="mb-4 font-heading text-lg font-bold text-white">Subir comprobante de pago</h3>
        <form id="receipt-form">
          <input type="hidden" name="paymentId">
          <div class="mb-4">
            ${renderFileDropzone({
              name: 'receipt',
              label: 'Comprobante de pago',
              accept: 'image/*,application/pdf',
              maxSizeMB: 10,
            })}
          </div>
          <p id="receipt-error" class="mb-3 hidden text-sm text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Subir</button>
            <button type="button" id="close-receipt-modal"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</button>
          </div>
        </form>
      </div>
    </div>`

  document.getElementById('page-content')!.innerHTML = html
  initFileDropzone(document.getElementById('page-content')!)

  document.querySelectorAll('.upload-receipt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const paymentId = (btn as HTMLElement).closest('.payment-item')?.getAttribute('data-payment-id')
      if (!paymentId) return
      const modal = document.getElementById('receipt-modal')!
      modal.querySelector<HTMLInputElement>('input[name="paymentId"]')!.value = paymentId
      modal.classList.remove('hidden')
    })
  })

  document.getElementById('close-receipt-modal')?.addEventListener('click', () => {
    document.getElementById('receipt-modal')!.classList.add('hidden')
  })

  document.getElementById('receipt-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const file = fd.get('receipt') as File
    const paymentId = fd.get('paymentId') as string

    if (!file || file.size === 0) return

    const { url, error: uploadErr } = await uploadFileFromInput('receipts', paymentId, 'receipts', file)
    if (uploadErr) {
      const errEl = document.getElementById('receipt-error')!
      errEl.textContent = uploadErr
      errEl.classList.remove('hidden')
      return
    }

    const { error } = await supabase.from('payments').update({ receipt_url: url }).eq('id', paymentId)
    if (error) {
      const errEl = document.getElementById('receipt-error')!
      errEl.textContent = error.message
      errEl.classList.remove('hidden')
      return
    }

    toast('success', 'Comprobante subido correctamente')
    document.getElementById('receipt-modal')!.classList.add('hidden')
    initPayments()
  })

  // PayPal buttons
  const paypalContainers = document.querySelectorAll<HTMLElement>('.paypal-btn-container')
  if (paypalContainers.length > 0) {
    const sdkUrl = `https://www${PAYPAL_SANDBOX ? '.sandbox' : ''}.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`
    if (!document.querySelector(`script[src="${sdkUrl}"]`)) {
      const script = document.createElement('script')
      script.src = sdkUrl
      script.onload = () => renderPaypalButtons(paypalContainers)
      document.head.appendChild(script)
    } else if ((window as any).paypal) {
      renderPaypalButtons(paypalContainers)
    }
  }

  startPaymentCountdown()
}

function startPaymentCountdown(): void {
  const els = document.querySelectorAll<HTMLElement>('.payment-countdown')
  if (els.length === 0) return
  const tick = () => {
    const now = Date.now()
    els.forEach(el => {
      const expires = parseInt(el.dataset.expires || '0')
      if (!expires) return
      const diff = expires - now
      if (diff <= 0) {
        el.textContent = 'Vencido'
        el.className = 'payment-countdown block text-xs mt-1 text-red-400'
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      el.textContent = `Vence en: ${days}d ${hours}h ${mins}m`
      el.className = 'payment-countdown block text-xs mt-1' + (diff < 86400000 ? ' text-red-400' : diff < 172800000 ? ' text-yellow-400' : ' text-zinc-400')
    })
  }
  tick()
  if ((window as any).__intvCountdown) clearInterval((window as any).__intvCountdown)
  ;(window as any).__intvCountdown = setInterval(tick, 60000)
}

function renderPaypalButtons(containers: NodeListOf<HTMLElement>) {
  containers.forEach(container => {
    const paymentId = container.dataset.paypalId
    const amount = container.dataset.amount
    if (!paymentId || !amount) return
    const div = document.createElement('div')
    div.id = `pp-${paymentId}`
    container.appendChild(div)
    ;(window as any).paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
      createOrder(data: any, actions: any) {
        return actions.order.create({
          purchase_units: [{ amount: { currency_code: 'USD', value: amount } }]
        })
      },
      onApprove(data: any, actions: any) {
        return actions.order.capture().then(async (details: any) => {
          if (details.status === 'COMPLETED') {
            const { error: upErr } = await supabase.from('payments').update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              method: 'paypal',
            }).eq('id', paymentId)
            if (upErr) {
              console.error('Error updating payment:', upErr)
              toast('error', 'Pago realizado pero error al actualizar. Contacta al coach.')
              return
            }
            toast('success', 'Pago confirmado vía PayPal')
            container.innerHTML = '<span class="text-xs text-green-400">✓ Pagado</span>'
            ;(window as any).__isExpired = false
            setTimeout(() => initPayments(), 1500)
          } else {
            console.warn('PayPal capture status:', details.status)
            toast('error', 'El pago no se completó. Intenta de nuevo.')
          }
        }).catch((err: any) => {
          console.error('PayPal capture error:', err)
          toast('error', 'Error al capturar el pago. ¿La cuenta de PayPal está verificada?')
        })
      },
      onError(err: any) {
        console.error('PayPal button error:', err)
        toast('error', 'Error al procesar el pago con PayPal')
      }
    }).render(`#pp-${paymentId}`)
  })
}

async function renderCoachPayments(): Promise<void> {
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, is_active')
    .order('start_date', { ascending: false })

  const activeSeason = seasons?.find((s: any) => s.is_active)
  const filterSeasonId = selectedSeasonId || activeSeason?.id || null

  // Load ALL students and players
  const { data: allStudents } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .in('role', ['student', 'player'])
    .order('full_name')

  // Load payments for the filtered season
  let paymentsQuery = supabase
    .from('payments')
    .select('*, seasons(name), profiles(full_name, email, avatar_url)')
    .order('created_at', { ascending: false })

  if (filterSeasonId) {
    paymentsQuery = paymentsQuery.eq('season_id', filterSeasonId)
  }

  const { data: payments } = await paymentsQuery

  // Get course names for each payment
  const payEnrollIds = [...new Set((payments ?? []).map((p: any) => p.enrollment_id).filter(Boolean))]
  const { data: enrollsForName } = await supabase
    .from('enrollments')
    .select('id, courses!course_id(name)')
    .in('id', payEnrollIds.length > 0 ? payEnrollIds : ['none'])
  const courseByEnrollId: Record<string, string> = {}
  for (const e of enrollsForName ?? []) courseByEnrollId[e.id] = (e as any).courses?.name || ''

  // Build payment map by profile_id
  const paymentMap = new Map<string, any>()
  for (const p of payments ?? []) {
    if (!paymentMap.has(p.profile_id)) paymentMap.set(p.profile_id, p)
  }

  const allProfiles = allStudents ?? []
  const paymentList = payments ?? []
  const totalStudents = allProfiles.length
  const paidCount = paymentList.filter((p: any) => p.status === 'paid').length
  const pendingCount = paymentList.filter((p: any) => p.status === 'pending').length
  const scholarshipCount = paymentList.filter((p: any) => p.status === 'scholarship').length
  const noPaymentCount = totalStudents - paidCount - pendingCount - scholarshipCount

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    paid: 'text-green-400 bg-green-500/10 border-green-500/30',
    scholarship: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    expired: 'text-red-400 bg-red-500/10 border-red-500/30',
  }
  const statusLabels: Record<string, string> = { pending: 'Pendiente', paid: 'Pagado', scholarship: 'Beca', expired: 'Vencido' }

  const seasonOptions = (seasons ?? []).map((s: any) =>
    `<option value="${escapeHtml(s.id)}" ${s.id === filterSeasonId ? 'selected' : ''}>${escapeHtml(s.name)}${s.is_active ? ' (Activa)' : ''}</option>`
  ).join('')

  const html = `
    <div class="mb-6">
      <h1 class="font-heading text-2xl font-bold text-white">Gestión de Pagos</h1>
      <p class="mt-1 text-sm text-zinc-500">Panel de administración de pagos</p>
    </div>

    <div class="mb-4">
      <select id="season-filter" class="w-full max-w-xs rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
        <option value="">Todas las temporadas</option>
        ${seasonOptions}
      </select>
    </div>

    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div class="glass rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-white">${totalStudents}</p>
        <p class="text-xs text-zinc-500">Total</p>
      </div>
      <div class="glass rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-green-400">${paidCount}</p>
        <p class="text-xs text-zinc-500">Pagados</p>
      </div>
      <div class="glass rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-yellow-400">${pendingCount}</p>
        <p class="text-xs text-zinc-500">Pendientes</p>
      </div>
      <div class="glass rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-blue-400">${scholarshipCount}</p>
        <p class="text-xs text-zinc-500">Becas</p>
      </div>
      <div class="glass rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-zinc-500">${noPaymentCount}</p>
        <p class="text-xs text-zinc-500">Sin pago</p>
      </div>
    </div>

    <div class="glass rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800">
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Estudiante</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Temporada</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Tipo</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Monto</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Estado</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Comprobante</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Pagado</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Vence en</th>
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${allProfiles.length === 0
              ? '<tr><td colspan="9" class="px-4 py-8 text-center text-zinc-500">No hay estudiantes o jugadores registrados.</td></tr>'
              : allProfiles.map((prof: any) => {
                  const pay = paymentMap.get(prof.id)
                  return `
                <tr class="border-b border-zinc-800/50 hover:bg-zinc-800/20" ${pay ? `data-payment-id="${escapeHtml(pay.id)}"` : ''}>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                        ${prof.avatar_url
                          ? `<img src="${escapeHtml(prof.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : (prof.full_name?.charAt(0) ?? '?')
                        }
                      </div>
                      <div>
                        <p class="font-medium text-white">${escapeHtml(prof.full_name || 'Desconocido')}</p>
                        <p class="text-xs text-zinc-500">${escapeHtml(prof.email || '')}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-zinc-300">${pay ? escapeHtml(courseByEnrollId[pay.enrollment_id] || pay.seasons?.name || '—') : '—'}</td>
                  <td class="px-4 py-3 capitalize text-zinc-300">${escapeHtml(prof.role)}</td>
                  <td class="px-4 py-3 text-zinc-300">${pay?.amount ? '$' + pay.amount : '—'}</td>
                  <td class="px-4 py-3">
                    ${pay
                      ? `<span class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[pay.status] || 'text-zinc-500'}">${statusLabels[pay.status] || escapeHtml(pay.status)}</span>`
                      : '<span class="inline-block rounded-full border border-zinc-700/30 px-2.5 py-0.5 text-xs font-medium text-zinc-600">Sin pago</span>'
                    }
                  </td>
                  <td class="px-4 py-3">
                    ${pay?.receipt_url
                      ? `<a href="${escapeHtml(pay.receipt_url)}" target="_blank" class="text-xs text-[#8B5CF6] hover:underline">Ver comprobante</a>`
                      : '<span class="text-xs text-zinc-600">—</span>'
                    }
                  </td>
                  <td class="px-4 py-3 text-xs text-zinc-500">${pay?.paid_at ? formatDate(pay.paid_at) : '—'}</td>
                  <td class="px-4 py-3">
                    ${pay && pay.status === 'pending' && pay.created_at
                      ? `<span class="payment-countdown text-xs whitespace-nowrap" data-expires="${new Date(pay.created_at).getTime() + 172800000}"></span>`
                      : '<span class="text-xs text-zinc-600">—</span>'
                    }
                  </td>
                  <td class="px-4 py-3">
                    ${pay
                      ? `<div class="flex items-center gap-1">` +
                        `<select class="pay-status-select rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none" data-payment-id="${escapeHtml(pay.id)}" data-profile-id="${escapeHtml(pay.profile_id)}" data-old-status="${escapeHtml(pay.status)}">
                          <option value="pending" ${pay.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                          <option value="paid" ${pay.status === 'paid' ? 'selected' : ''}>Pagado</option>
                          <option value="scholarship" ${pay.status === 'scholarship' ? 'selected' : ''}>Beca</option>
                          <option value="expired" ${pay.status === 'expired' ? 'selected' : ''}>Vencido</option>
                        </select>` +
                        (pay.status === 'pending' && pay.created_at && (new Date().getTime() - new Date(pay.created_at).getTime()) > 432000000
                          ? `<button class="notify-payment-btn text-xs text-yellow-400 hover:text-yellow-300" data-profile-id="${escapeHtml(pay.profile_id)}" data-payment-id="${escapeHtml(pay.id)}" title="Notificar recordatorio">${Icon('bell', 12)}</button>`
                          : '') +
                        `</div>`
                      : `<button class="create-payment-btn text-xs text-[#8B5CF6] hover:underline" data-profile-id="${escapeHtml(prof.id)}" data-season-id="${filterSeasonId || ''}" data-role="${escapeHtml(prof.role)}">${Icon('plus', 12)} Crear pago</button>`
                    }
                  </td>
                </tr>`}).join('')
            }
          </tbody>
        </table>
      </div>
    </div>`

  document.getElementById('page-content')!.innerHTML = html

  document.getElementById('season-filter')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value
    selectedSeasonId = val || null
    renderCoachPayments()
  })

  document.querySelectorAll('.pay-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const select = sel as HTMLSelectElement
      const newStatus = select.value
      const oldStatus = select.dataset.oldStatus || ''
      const paymentId = select.dataset.paymentId
      const profileId = select.dataset.profileId
      if (!paymentId) return

      const updateData: Record<string, any> = { status: newStatus }
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString()
      if (newStatus !== 'paid') updateData.paid_at = null

      await supabase.from('payments').update(updateData).eq('id', paymentId)
      select.dataset.oldStatus = newStatus

      // Sync profiles.scholarship
      if (newStatus === 'scholarship' && profileId) {
        await supabase.from('profiles').update({ scholarship: true }).eq('id', profileId)
      } else if (oldStatus === 'scholarship' && profileId) {
        const { data: otherScholarships } = await supabase
          .from('payments')
          .select('id')
          .eq('profile_id', profileId)
          .eq('status', 'scholarship')
          .neq('id', paymentId)
        if (!otherScholarships || otherScholarships.length === 0) {
          await supabase.from('profiles').update({ scholarship: false }).eq('id', profileId)
        }
      }

      renderCoachPayments()
    })
  })

  document.querySelectorAll('.create-payment-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const profileId = (btn as HTMLElement).dataset.profileId
      const seasonId = (btn as HTMLElement).dataset.seasonId
      const role = (btn as HTMLElement).dataset.role
      if (!profileId || !seasonId) return

      const { data: profile } = await supabase.from('profiles').select('scholarship').eq('id', profileId).maybeSingle()
      await supabase.from('payments').insert({
        profile_id: profileId,
        season_id: seasonId,
        type: role || 'student',
        status: profile?.scholarship ? 'scholarship' : 'pending',
        amount: 1.54,
      })
      renderCoachPayments()
    })
  })

  document.querySelectorAll('.notify-payment-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const profileId = (btn as HTMLElement).dataset.profileId
      const paymentId = (btn as HTMLElement).dataset.paymentId
      if (!profileId || !paymentId) return
      await supabase.from('notifications').insert({
        profile_id: profileId,
        type: 'payment',
        title: 'Recordatorio de pago',
        body: 'Tu pago está por vencer. Realízalo pronto para evitar la suspensión del servicio.',
        link: '/payments',
      })
      toast('success', 'Recordatorio enviado al estudiante')
    })
  })

  startPaymentCountdown()
}
