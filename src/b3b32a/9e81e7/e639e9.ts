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

const PAYPAL_CLIENT_ID = 'ASjqwWQof0YKxBx4ZlQ03H4wQobDw3eytN-el650Yb3d0mjOcREb6FHHCEFd6UMd__jp_1yjBPPI76um'
const PAYPAL_SANDBOX = false

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
  const EXPIRE_MS = 2 * 24 * 60 * 60 * 1000
  const { data: pendingPays } = await supabase.from('payments').select('id, created_at').eq('profile_id', userId).eq('status', 'pending')
  for (const pp of pendingPays ?? []) {
    if (pp.created_at && Date.now() - new Date(pp.created_at).getTime() > EXPIRE_MS) {
      await supabase.from('payments').update({ status: 'expired' }).eq('id', pp.id)
    }
  }
  let { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

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
    .select('*, courses(name)')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  // Skip payment creation for free courses that already have paid $0 payments
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
  const { data: coursePrices } = await supabase.from('courses').select('id, price').in('id', [...new Set((enrollments ?? []).map((e: any) => e.course_id))])
  const freeCourses = new Set((coursePrices ?? []).filter((c: any) => !c.price || c.price <= 0).map((c: any) => c.id))
  for (const e of enrollments ?? []) {
    if (freeCourses.has(e.course_id)) continue
    if (!paidPassedCourses.has(e.course_id) && !enrollWithPayment.has(e.id)) {
      const { data: profile } = await supabase.from('profiles').select('scholarship').eq('id', userId).maybeSingle()
      const { error: insErr } = await supabase.from('payments').insert({
        profile_id: userId,
        enrollment_id: e.id,
        type: e.type || 'student',
        status: profile?.scholarship ? 'scholarship' : 'pending',
        amount: 1.54,
      })
      if (insErr && insErr.code === '23505') {
      } else if (insErr) {
        console.error('Error creating payment:', insErr)
      }
    }
  }

  if ((payments ?? []).length === 0 && (enrollments ?? []).length > 0) {
    const { data: refreshed } = await supabase
      .from('payments')
      .select('*')
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
              <p class="text-xs text-zinc-500">${escapeHtml(e.courses?.name || '')}</p>
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
                <p class="text-sm font-medium text-white">${escapeHtml(courseByEnroll[p.enrollment_id] || 'Pago')}</p>
              <p class="text-xs text-zinc-500">${p.paid_at ? 'Pagado: ' + formatDate(p.paid_at) : ''}</p>
            </div>
            ${p.status === 'scholarship'
              ? `<span class="shrink-0 text-sm font-medium text-blue-400">${statusLabels.scholarship}</span>`
              : p.status === 'paid' && (!p.amount || p.amount <= 0)
                ? `<span class="shrink-0 text-sm font-medium text-green-400">Gratuito</span>`
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

  // Stripe return check
  const hashQuery = location.hash.split('?')[1] || ''
  const params = new URLSearchParams(hashQuery)
  if (params.get('stripe') === 'success') {
    const sessionId = params.get('session_id')
    const paymentId = params.get('payment_id')
    if (sessionId && paymentId) {
      handleStripeReturn(sessionId, paymentId)
    }
  }

  startPaymentCountdown()
}

async function handleStripeReturn(sessionId: string, paymentId: string): Promise<void> {
  try {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`
    const res = await fetch(funcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
      body: JSON.stringify({ action: 'verify', sessionId, paymentId }),
    })
    const data = await res.json()
    if (data?.verified) {
      await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString(), method: 'stripe' }).eq('id', paymentId)
      toast('success', 'Pago confirmado vía Stripe')
      const cleanHash = location.hash.split('?')[0]
      window.history.replaceState({}, '', cleanHash || '#/payments')
      setTimeout(() => initPayments(), 1500)
    } else {
      toast('error', 'El pago no se completó o está pendiente de verificación.')
    }
  } catch (err: any) {
    toast('error', 'Error al verificar pago: ' + (err.message || 'desconocido'))
  }
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
      if (diff <= 0) { el.textContent = 'Vencido'; el.className = 'payment-countdown block text-xs mt-1 text-red-400'; return }
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
            const { error: upErr } = await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString(), method: 'paypal' }).eq('id', paymentId)
            if (upErr) { console.error('Error updating payment:', upErr); toast('error', 'Pago realizado pero error al actualizar. Contacta al coach.'); return }
            toast('success', 'Pago confirmado vía PayPal')
            container.innerHTML = '<span class="text-xs text-green-400">✓ Pagado</span>'
            ;(window as any).__isExpired = false
            setTimeout(() => initPayments(), 1500)
          } else { console.warn('PayPal capture status:', details.status); toast('error', 'El pago no se completó. Intenta de nuevo.') }
        }).catch((err: any) => { console.error('PayPal capture error:', err); toast('error', 'Error al capturar el pago. ¿La cuenta de PayPal está verificada?') })
      },
      onError(err: any) { console.error('PayPal button error:', err); toast('error', 'Error al procesar el pago con PayPal') }
    }).render(`#pp-${paymentId}`)
  })
}

async function renderCoachPayments(): Promise<void> {
  const { data: courses } = await supabase.from('courses').select('*').order('display_order')
  const courseIds = (courses ?? []).map((c: any) => c.id)
  const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

  const { data: enrolls } = await supabase.from('enrollments').select('id, profile_id, course_id, status, profiles!inner(full_name, email, avatar_url, role)').in('course_id', idFilter)
  const enrollIds = (enrolls ?? []).map((e: any) => e.id)
  const enrollIdFilter = enrollIds.length > 0 ? enrollIds : ['00000000-0000-0000-0000-000000000000']

  const { data: payments } = await supabase.from('payments').select('*, profiles!inner(full_name, email, avatar_url)').in('enrollment_id', enrollIdFilter)

  const studentCount: Record<string, number> = {}
  const paidCount: Record<string, number> = {}
  const pendingCount: Record<string, number> = {}
  const expiredCount: Record<string, number> = {}
  const freeCount: Record<string, number> = {}

  for (const e of enrolls ?? []) {
    studentCount[e.course_id] = (studentCount[e.course_id] || 0) + 1
  }
  for (const p of payments ?? []) {
    const cid = (enrolls ?? []).find((e: any) => e.id === p.enrollment_id)?.course_id
    if (!cid) continue
    if (p.status === 'paid') paidCount[cid] = (paidCount[cid] || 0) + 1
    else if (p.status === 'pending') pendingCount[cid] = (pendingCount[cid] || 0) + 1
    else if (p.status === 'expired') expiredCount[cid] = (expiredCount[cid] || 0) + 1
    if (p.status === 'paid' && (!p.amount || p.amount <= 0)) freeCount[cid] = (freeCount[cid] || 0) + 1
  }

  const modalsHtml = `
  <div id="course-payments-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Pagos por curso">
    <div class="glass max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 id="course-payments-title" class="font-heading text-lg font-bold text-white">Pagos del curso</h2>
        <button id="close-course-payments" class="text-zinc-500 hover:text-white" aria-label="Cerrar">${Icon('x', 18)}</button>
      </div>
      <div id="course-payments-list" class="space-y-2"></div>
    </div>
  </div>`

  document.getElementById('page-content')!.innerHTML = `
    <div class="mb-6">
      <h1 class="font-heading text-2xl font-bold text-white">Gestión de Pagos</h1>
      <p class="mt-1 text-sm text-zinc-500">Selecciona un curso para ver los pagos de los estudiantes</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${(courses ?? []).length === 0 ? '<p class="text-sm text-zinc-500">No hay cursos.</p>' :
        (courses ?? []).map((c: any) => {
          const total = studentCount[c.id] || 0
          const paid = paidCount[c.id] || 0
          const pending = pendingCount[c.id] || 0
          const expired = expiredCount[c.id] || 0
          const isFree = !c.price || c.price <= 0
          return `
          <button class="course-pay-btn glass rounded-xl p-5 text-left transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5" data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-white">${escapeHtml(c.name)}</h3>
              ${Icon('chevronRight', 20)}
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">${total} inscritos</span>
              ${isFree
                ? `<span class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400">Gratis</span>`
                : `<span class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400">${paid} pagados</span>
                   <span class="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs text-yellow-400">${pending} pendientes</span>
                   ${expired > 0 ? `<span class="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-400">${expired} vencidos</span>` : ''}`
              }
            </div>
          </button>`
        }).join('')
      }
    </div>
    ${modalsHtml}`

  // Course payment details
  const coursePaymentsModal = document.getElementById('course-payments-modal')!
  document.getElementById('close-course-payments')?.addEventListener('click', () => coursePaymentsModal.classList.add('hidden'))
  coursePaymentsModal.addEventListener('click', (e) => { if (e.target === coursePaymentsModal) coursePaymentsModal.classList.add('hidden') })
  coursePaymentsModal.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !coursePaymentsModal.classList.contains('hidden')) coursePaymentsModal.classList.add('hidden') })
  if (!coursePaymentsModal.getAttribute('tabindex')) coursePaymentsModal.setAttribute('tabindex', '-1')

  document.querySelectorAll('.course-pay-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const courseId = (btn as HTMLElement).dataset.courseId
      const courseName = (btn as HTMLElement).dataset.courseName || ''
      if (!courseId) return

      const { data: course } = await supabase.from('courses').select('price').eq('id', courseId).maybeSingle()
      const isFree = !course?.price || course?.price <= 0

      const { data: courseEnrolls } = await supabase
        .from('enrollments')
        .select('id, profile_id, status, profiles!inner(full_name, email, avatar_url, role)')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const enrollIds = (courseEnrolls ?? []).map((e: any) => e.id)
      const { data: coursePays } = enrollIds.length > 0
        ? await supabase.from('payments').select('*').in('enrollment_id', enrollIds)
        : { data: [] }
      const payByEnroll: Record<string, any> = {}
      for (const p of coursePays ?? []) payByEnroll[p.enrollment_id] = p

      document.getElementById('course-payments-title')!.textContent = `${escapeHtml(courseName)} — Pagos`
      document.getElementById('course-payments-list')!.innerHTML = (courseEnrolls ?? []).length === 0
        ? '<p class="text-sm text-zinc-500 text-center py-8">No hay estudiantes inscritos en este curso.</p>'
        : (courseEnrolls ?? []).map((e: any) => {
            const prof = e.profiles || {}
            const pay = payByEnroll[e.id]
            const status = pay?.status || (isFree ? 'paid' : 'none')
            const amount = pay?.amount || (isFree ? 0 : 1.54)
            const badge = isFree
              ? '<span class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400">Gratuito</span>'
              : !pay
                ? '<span class="rounded-full border border-zinc-700/30 px-2.5 py-0.5 text-xs text-zinc-600">Sin pago</span>'
                : pay.status === 'paid'
                  ? '<span class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400">Pagado</span>'
                  : pay.status === 'pending'
                    ? '<span class="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs text-yellow-400">Pendiente</span>'
                    : pay.status === 'scholarship'
                      ? '<span class="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400">Beca</span>'
                      : '<span class="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-400">Vencido</span>'
            return `
            <div class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                  ${prof.avatar_url ? `<img src="${escapeHtml(prof.avatar_url)}" alt="" class="h-full w-full object-cover" />` : escapeHtml((prof.full_name?.charAt(0) ?? '?').toUpperCase())}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-white truncate">${escapeHtml(prof.full_name || 'Desconocido')}</p>
                  <p class="text-xs text-zinc-500">${escapeHtml(prof.email || '')}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${badge}
                ${!isFree && pay && pay.status !== 'paid' ? `
                <div class="flex items-center gap-1">
                  <select class="pay-status-select rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none"
                    data-payment-id="${escapeHtml(pay.id)}" data-profile-id="${escapeHtml(prof.id)}" data-old-status="${escapeHtml(pay.status)}">
                    <option value="pending" ${pay.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="paid" ${pay.status === 'paid' ? 'selected' : ''}>Pagado</option>
                    <option value="scholarship" ${pay.status === 'scholarship' ? 'selected' : ''}>Beca</option>
                    <option value="expired" ${pay.status === 'expired' ? 'selected' : ''}>Vencido</option>
                  </select>
                  ${pay.status === 'pending' && pay.created_at && (Date.now() - new Date(pay.created_at).getTime()) > 432000000
                    ? `<button class="notify-payment-btn text-xs text-yellow-400 hover:text-yellow-300" data-profile-id="${escapeHtml(prof.id)}" data-payment-id="${escapeHtml(pay.id)}">${Icon('bell', 12)}</button>`
                    : ''}
                </div>` : ''}
                ${!isFree && !pay ? `
                <button class="create-payment-btn text-xs text-[#8B5CF6] hover:underline" data-profile-id="${escapeHtml(prof.id)}" data-role="${escapeHtml(prof.role || 'student')}">${Icon('plus', 12)} Crear pago</button>` : ''}
              </div>
            </div>`
          }).join('')

      coursePaymentsModal.classList.remove('hidden')
      coursePaymentsModal.focus()
    })
  })

  // Modal event handlers
  document.getElementById('course-payments-list')?.addEventListener('click', async (e) => {
    const sel = (e.target as HTMLElement).closest('.pay-status-select') as HTMLSelectElement
    if (sel) {
      const select = sel
      const newStatus = select.value
      const oldStatus = select.dataset.oldStatus || ''
      const paymentId = select.dataset.paymentId
      const profileId = select.dataset.profileId
      if (!paymentId) return
      await supabase.from('payments').update({ status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString() : null }).eq('id', paymentId)
      select.dataset.oldStatus = newStatus
      if (newStatus === 'scholarship' && profileId) {
        await supabase.from('profiles').update({ scholarship: true }).eq('id', profileId)
      } else if (oldStatus === 'scholarship' && profileId) {
        const { data: otherScholarships } = await supabase.from('payments').select('id').eq('profile_id', profileId).eq('status', 'scholarship').neq('id', paymentId)
        if (!otherScholarships || otherScholarships.length === 0) await supabase.from('profiles').update({ scholarship: false }).eq('id', profileId)
      }
    }
  })

  document.getElementById('course-payments-list')?.addEventListener('click', async (e) => {
    const createBtn = (e.target as HTMLElement).closest('.create-payment-btn') as HTMLElement
    if (!createBtn) return
    const profileId = createBtn.dataset.profileId
    const role = createBtn.dataset.role
    if (!profileId) return
    const { data: profile } = await supabase.from('profiles').select('scholarship').eq('id', profileId).maybeSingle()
    await supabase.from('payments').insert({ profile_id: profileId, type: role || 'student', status: profile?.scholarship ? 'scholarship' : 'pending', amount: 1.54 })
    toast('success', 'Pago creado')
    // Re-open modal for current course
    const coursePayBtn = document.querySelector('.course-pay-btn:focus, .course-pay-btn:hover') as HTMLElement
    if (coursePayBtn) { coursePayBtn.click() }
    else { renderCoachPayments() }
  })

  document.getElementById('course-payments-list')?.addEventListener('click', async (e) => {
    const notifyBtn = (e.target as HTMLElement).closest('.notify-payment-btn') as HTMLElement
    if (!notifyBtn) return
    const profileId = notifyBtn.dataset.profileId
    const paymentId = notifyBtn.dataset.paymentId
    if (!profileId || !paymentId) return
    await supabase.from('notifications').insert({ profile_id: profileId, type: 'payment', title: 'Recordatorio de pago', body: 'Tu pago está por vencer. Realízalo pronto para evitar la suspensión del servicio.', link: '/payments' })
    toast('success', 'Recordatorio enviado al estudiante')
  })
}
