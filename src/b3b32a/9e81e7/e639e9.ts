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
import { autoEnrollGeneralCourses, autoEnrollComplementaria } from '@/2b3583/course_utils'
import { getAssignedCourseIds } from '@/2b3583/assignments'
import { SearchInput, bindSearchInput, exportExcel } from '@/4725dc/ui_kit'
import { CURRENCIES, guessCurrencyCode, fetchRates, toUsd, getCachedRates } from '@/2b3583/fx'

const PAYPAL_CLIENT_ID = 'ASjqwWQof0YKxBx4ZlQ03H4wQobDw3eytN-el650Yb3d0mjOcREb6FHHCEFd6UMd__jp_1yjBPPI76um'
const PAYPAL_SANDBOX = false

// Sistema mensual: renovación el día 2, corte de pago el día 29
function nextPayDayTs(): number {
  const now = new Date()
  const d = now.getDate()
  let target = new Date(now.getFullYear(), now.getMonth(), 2)
  if (d >= 2) target = new Date(now.getFullYear(), now.getMonth() + 1, 2)
  return target.getTime()
}
function nextCutDayTs(): number {
  const now = new Date()
  const d = now.getDate()
  let target = new Date(now.getFullYear(), now.getMonth(), 29)
  if (d >= 29) target = new Date(now.getFullYear(), now.getMonth() + 1, 29)
  return target.getTime()
}

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
  // Sistema mensual: pago el día 2, paid pasa a pending cada día 29
  const now = new Date()
  const today = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const { data: pendingPays } = await supabase.from('payments').select('id, created_at, paid_usd').eq('profile_id', userId).eq('status', 'pending')
  for (const pp of pendingPays ?? []) {
    if (Number(pp.paid_usd || 0) > 0) continue
    if (pp.created_at) {
      const created = new Date(pp.created_at)
      const isLastMonth = created.getMonth() !== currentMonth || created.getFullYear() !== currentYear
      if (today >= 5 && isLastMonth) {
        await supabase.from('payments').update({ status: 'expired' }).eq('id', pp.id)
      }
    }
  }
  const { data: paidPays } = await supabase.from('payments').select('id, paid_at').eq('profile_id', userId).eq('status', 'paid')
  for (const pp of paidPays ?? []) {
    const paidAt = pp.paid_at ? new Date(pp.paid_at) : null
    const paidThisMonth = paidAt && paidAt.getMonth() === currentMonth && paidAt.getFullYear() === currentYear
    if (today >= 29 && !paidThisMonth) {
      await supabase.from('payments').update({ status: 'pending', paid_at: null }).eq('id', pp.id)
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
      const alreadyPassed = (enrollments ?? []).some((e2: any) => e2.course_id === (enr as any).course_id && e2.final_grade !== null && e2.final_grade >= 14 && e2.promoted)
      if (alreadyPassed) paidPassedCourses.add((enr as any).course_id)
    }
  }
  const { data: coursePrices } = await supabase.from('courses').select('id, price').in('id', [...new Set((enrollments ?? []).map((e: any) => e.course_id))])
  const priceMap: Record<string, number> = {}
  for (const c of coursePrices ?? []) priceMap[c.id] = c.price ?? 15
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
        amount: priceMap[e.course_id] ?? 15,
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

  const statusColors: Record<string, string> = { free: 'text-green-400', pending: 'text-yellow-400', paid: 'text-green-400', scholarship: 'text-blue-400', expired: 'text-red-400' }
  const statusLabels: Record<string, string> = { free: 'Gratis', pending: 'Debes', paid: 'Pagaste', scholarship: 'Cubierto por beca', expired: 'Vencido' }

  const fmtUsd = (n: number) => `$${Math.max(0, n).toFixed(2)}`
  const paymentOwed = (p: any) => {
    const fee = Number(p.amount ?? 15)
    const paidUsd = Number(p.paid_usd || 0)
    return Math.max(0, fee - paidUsd)
  }

  const visiblePayments = (payments ?? []).filter((p: any) => p.enrollment_id && activeEnrollIds.has(p.enrollment_id))
  const totalOwed = visiblePayments.reduce((acc: number, p: any) => {
    if (p.status === 'paid' || p.status === 'scholarship' || p.status === 'free') return acc
    return acc + paymentOwed(p)
  }, 0)

  const html = `
    <div class="mb-6">
      <span class="kicker">Historial y facturación</span>
      <h1 class="font-heading text-2xl font-bold text-white">Pagos</h1>
      <p class="mt-1 text-sm text-zinc-500">Historial de pagos y facturación</p>
    </div>

    <div class="mb-6 rounded-xl border ${totalOwed > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-green-500/30 bg-green-500/10'} p-4">
      ${totalOwed > 0
        ? `<p class="text-sm text-zinc-300">Tienes un saldo pendiente de <span class="font-bold text-amber-400">${fmtUsd(totalOwed)}</span></p>
           <p class="mt-0.5 text-xs text-zinc-500">Cuando pagues el total, tu estado pasará a pagado.</p>`
        : '<p class="text-sm text-green-400">Estás al día con tus pagos.</p>'}
    </div>

    ${(enrollments ?? []).length > 0 ? `
      <div class="mb-8 space-y-3">
        <h2 class="font-heading text-lg font-bold text-white">Cursos activos</h2>
        ${(enrollments ?? []).map((e: any) => `
          <div class="glass rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Curso')}</h3>
            </div>
            <span class="text-xs ${statusColors[e.type === 'student' ? 'paid' : 'pending']}">${e.type === 'student' ? 'Activo' : 'Pendiente'}</span>
          </div>
        `).join('')}
      </div>` : ''}

    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-heading text-lg font-bold text-white">Historial de pagos</h2>
        <div class="w-full max-w-xs">
          ${SearchInput({ id: 'pay-search', placeholder: 'Buscar pago o estado...' })}
        </div>
      </div>
      ${(() => {
        const visiblePayments = (payments ?? []).filter((p: any) => p.enrollment_id && activeEnrollIds.has(p.enrollment_id))
        return visiblePayments.length === 0
          ? '<p class="text-sm text-zinc-500">No hay pagos registrados.</p>'
          : visiblePayments.map((p: any) => `
          <div class="payment-item glass rounded-xl p-4 space-y-3" data-payment-id="${escapeHtml(p.id)}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">${escapeHtml(courseByEnroll[p.enrollment_id] || 'Pago')}</p>
              ${p.paid_at ? `<p class="text-xs text-zinc-500">Pagado: ${formatDate(p.paid_at)}<span class="text-zinc-600"> · </span><span class="paid-countdown" data-expires="${nextCutDayTs()}"></span></p>` : ''}
            </div>
            ${p.status === 'scholarship'
              ? `<span class="shrink-0 text-sm font-medium text-blue-400">${statusLabels.scholarship}</span>`
              : p.status === 'free'
                ? `<span class="shrink-0 text-sm font-medium text-green-400">Gratuito</span>`
                : Number(p.paid_usd) > 0 && paymentOwed(p) > 0.005
                  ? `<div class="shrink-0 text-right">
                      <span class="text-sm font-medium text-amber-400">Debiendo ${fmtUsd(paymentOwed(p))}</span>
                      <span class="block text-xs text-zinc-500">Abonado ${fmtUsd(Number(p.paid_usd))} de ${fmtUsd(Number(p.amount ?? 15))}</span>
                    </div>`
                  : `<span class="shrink-0 text-sm font-medium ${statusColors[p.status] || 'text-zinc-500'}">${statusLabels[p.status] || escapeHtml(p.status)} ${fmtUsd(Number(p.amount ?? 15))}</span>`
            }
          </div>
          ${p.status === 'pending' && p.created_at ? `<span class="payment-countdown block text-xs mt-1" data-expires="${nextPayDayTs()}"></span>` : ''}
          ${p.status === 'expired' ? `<span class="payment-countdown block text-xs mt-1 text-red-400">Vencido — paga para renovar tu suscripción</span>` : ''}
          ${p.status === 'pending' || p.status === 'expired' ? `
          <div class="flex flex-col gap-2">
            <div class="paypal-btn-container" data-paypal-id="${escapeHtml(p.id)}" data-amount="${p.amount ?? 15}"></div>
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
    </div>`
  document.getElementById('page-content')!.innerHTML = html

  bindSearchInput(document.getElementById('page-content')!, 'pay-search', (q) => {
    document.querySelectorAll('.payment-item').forEach(item => {
      const el = item as HTMLElement
      const text = el.innerText.toLowerCase()
      const match = !q || text.includes(q)
      el.classList.toggle('hidden', !match)
    })
  })

  const receiptModalHtml = `
    <div id="receipt-modal" class="fixed inset-0 z-50 hidden overflow-y-auto bg-black/60" role="dialog" aria-modal="true" aria-label="Subir comprobante">
      <div class="flex min-h-full items-center justify-center p-4">
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
      </div>
    </div>`
  document.getElementById('modal-root')!.insertAdjacentHTML('beforeend', receiptModalHtml)
  initFileDropzone(document.getElementById('modal-root')!)

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
    const { error } = await supabase.from('payments').update({ receipt_url: url, status: 'pending' }).eq('id', paymentId)
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
      const { data: payData } = await supabase.from('payments').select('profile_id').eq('id', paymentId).maybeSingle()
      if (payData) { autoEnrollGeneralCourses(payData.profile_id, 'student'); autoEnrollComplementaria(payData.profile_id, 'student') }
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
  const tick = () => {
    const now = Date.now()
    document.querySelectorAll<HTMLElement>('.payment-countdown').forEach(el => {
      const expires = parseInt(el.dataset.expires || '0')
      if (!expires) return
      const diff = expires - now
      if (diff <= 0) { el.textContent = 'Vencido'; el.className = 'payment-countdown block text-xs mt-1 text-red-400'; return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      let text = ''
      if (days > 0) text += `${days}d `
      text += `${hours}h ${mins}m`
      if (days === 0) text += ` ${secs}s`
      el.textContent = `Vence en: ${text}`
      el.className = 'payment-countdown block text-xs mt-1' + (diff < 86400000 ? ' text-red-400' : diff < 172800000 ? ' text-yellow-400' : ' text-zinc-400')
    })
    document.querySelectorAll<HTMLElement>('.paid-countdown').forEach(el => {
      const paidAt = parseInt(el.dataset.paidAt || '0')
      if (!paidAt) return
      const elapsed = now - paidAt
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 86400000))
      if (remaining <= 0) { el.textContent = 'Vencido'; el.className = 'paid-countdown text-red-400'; return }
      el.textContent = `${remaining}d restantes`
      el.className = 'paid-countdown' + (remaining <= 3 ? ' text-red-400' : remaining <= 7 ? ' text-yellow-400' : ' text-zinc-500')
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
            const { data: ppData } = await supabase.from('payments').select('profile_id').eq('id', paymentId).maybeSingle()
            if (ppData) { autoEnrollGeneralCourses(ppData.profile_id, 'student'); autoEnrollComplementaria(ppData.profile_id, 'student') }
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
  const { data: { session } } = await supabase.auth.getSession()
  const assignedIds = await getAssignedCourseIds(session?.user?.id || '')

  let coursesQuery = supabase.from('courses').select('*').order('display_order')
  if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
  const { data: courses } = await coursesQuery
  const courseIds = (courses ?? []).map((c: any) => c.id)
  const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

  const { data: enrolls } = await supabase.from('enrollments').select('id, profile_id, course_id, status, profiles!inner(full_name, email, avatar_url, role, platform)').in('course_id', idFilter)
  const enrollIds = (enrolls ?? []).map((e: any) => e.id)
  const enrollIdFilter = enrollIds.length > 0 ? enrollIds : ['00000000-0000-0000-0000-000000000000']

  const { data: payments } = await supabase.from('payments').select('*, profiles!inner(full_name, email, avatar_url)').in('enrollment_id', enrollIdFilter)

  let pendingChanges: { paymentId: string; profileId?: string; newStatus: string; oldStatus: string }[] = []

  const fmtUsd = (n: number) => `$${Math.max(0, n).toFixed(2)}`

  const payByCourseEnroll: Record<string, Record<string, any>> = {}
  for (const p of payments ?? []) {
    const eid = p.enrollment_id
    const enr = (enrolls ?? []).find((x: any) => x.id === eid)
    if (!enr) continue
    if (!payByCourseEnroll[enr.course_id]) payByCourseEnroll[enr.course_id] = {}
    payByCourseEnroll[enr.course_id][eid] = p
  }

  const enrollsByCourse: Record<string, any[]> = {}
  for (const e of enrolls ?? []) {
    if (!enrollsByCourse[e.course_id]) enrollsByCourse[e.course_id] = []
    enrollsByCourse[e.course_id].push(e)
  }

  const filterHtml = (courses ?? []).map((c: any) => {
    const total = (enrollsByCourse[c.id] || []).length
    return `
    <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
      bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
      data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-course-count="${total}" data-active="1">
      ${Icon('checkCircle', 14)}
      <span>${escapeHtml(c.name)}</span>
      <span class="text-zinc-500">${total}</span>
    </button>`
  }).join('')

  const courseTables = (courses ?? []).map((c: any) => {
    const courseEnrolls = enrollsByCourse[c.id] || []
    const coursePays = payByCourseEnroll[c.id] || {}
    const isFree = !c.price || c.price <= 0

    const rows = courseEnrolls.map((e: any) => {
      const prof = e.profiles || {}
      const pay = coursePays[e.id]
      const status = pay?.status || (isFree ? 'free' : 'none')
      const platformBadge = prof.platform === 'mobile'
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
        : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`

      let daysLeft = ''
      const daysTo = (targetTs: number, empty: string) => {
        const diff = targetTs - Date.now()
        if (diff <= 0) return ` <span class="text-red-400">· vencido</span>`
        const d = Math.floor(diff / (24 * 60 * 60 * 1000))
        const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / 3600000)
        return d > 0 ? ` <span>· ${d}d ${h}h</span>` : empty
      }
      if (pay?.status === 'paid') {
        daysLeft = daysTo(nextCutDayTs(), ' <span class="text-red-400">· vence hoy</span>')
      } else if (pay?.status === 'scholarship') {
        // Los becados se renuevan igual el día 2; mostramos hasta el corte (29)
        daysLeft = daysTo(nextCutDayTs(), ' <span class="text-red-400">· vence hoy</span>')
      } else if (pay?.status === 'pending') {
        daysLeft = daysTo(nextPayDayTs(), ' <span class="text-red-400">· vencido</span>')
      } else if (pay?.status === 'expired') {
        daysLeft = ' <span class="text-red-400">· vencido</span>'
      }

      const payUsd = Number(pay?.paid_usd || 0)
      const feeUsd = Number(c.price || pay?.amount || 15)
      const owedUsd = Math.max(0, feeUsd - payUsd)
      const isPartial = pay && !isFree && pay.status !== 'paid' && pay.status !== 'scholarship' && payUsd > 0 && owedUsd > 0.005

      const badge = isFree
        ? '<span class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400">Gratuito</span>'
        : !pay
          ? '<span class="rounded-full border border-zinc-700/30 px-2.5 py-0.5 text-xs text-zinc-600">Sin pago</span>'
          : pay.status === 'paid'
            ? `<span class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400">Pagado${daysLeft}</span>`
            : isPartial
              ? `<span class="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-400">Debiendo ${fmtUsd(owedUsd)}${daysLeft}</span>`
              : pay.status === 'pending'
                ? `<span class="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs text-yellow-400">Pendiente${daysLeft}</span>`
                : pay.status === 'scholarship'
                  ? `<span class="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400">Beca${daysLeft}</span>`
                  : `<span class="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-400">Vencido${daysLeft}</span>`

      return `
        <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50">
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                ${prof.avatar_url ? `<img src="${escapeHtml(prof.avatar_url)}" alt="" class="h-full w-full object-cover" />` : escapeHtml((prof.full_name?.charAt(0) ?? '?').toUpperCase())}
              </div>
              <span class="text-sm text-white">${escapeHtml(prof.full_name || 'Desconocido')}</span>
            </div>
          </td>
          <td class="py-2.5 px-3 text-xs text-zinc-500 hidden md:table-cell">${escapeHtml(prof.email || '')}</td>
          <td class="py-2.5 px-3">${platformBadge}</td>
          <td class="py-2.5 px-3">${badge}</td>
          <td class="py-2.5 px-3 text-right">
            ${!isFree && pay ? `
              <div class="flex items-center justify-end gap-2">
                <select class="pay-status-select rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none"
                  data-payment-id="${escapeHtml(pay.id)}" data-profile-id="${escapeHtml(prof.id)}" data-old-status="${escapeHtml(pay.status)}" data-new-status="${escapeHtml(pay.status)}">
                  <option value="pending" ${pay.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                  <option value="paid" ${pay.status === 'paid' ? 'selected' : ''}>Pagado</option>
                  <option value="scholarship" ${pay.status === 'scholarship' ? 'selected' : ''}>Beca</option>
                  <option value="expired" ${pay.status === 'expired' ? 'selected' : ''}>Vencido</option>
                </select>
                ${pay.status !== 'paid' && pay.status !== 'scholarship' ? `
                <button class="pay-abono-btn flex items-center gap-1 text-xs text-[#8B5CF6] hover:underline" data-payment-id="${escapeHtml(pay.id)}" data-fee="${feeUsd}">${Icon('dollarSign', 11)} Abonar</button>` : ''}
              </div>` : ''}
            ${!isFree && !pay ? `
              <button class="create-payment-btn text-xs text-[#8B5CF6] hover:underline" data-profile-id="${escapeHtml(prof.id)}" data-enrollment-id="${escapeHtml(e.id)}" data-role="${escapeHtml(prof.role || 'student')}">${Icon('plus', 12)} Crear pago</button>` : ''}
          </td>
        </tr>`
    }).join('')

    const paid = courseEnrolls.filter((e: any) => coursePays[e.id]?.status === 'paid').length
    const pending = courseEnrolls.filter((e: any) => coursePays[e.id]?.status === 'pending').length
    const scholar = courseEnrolls.filter((e: any) => coursePays[e.id]?.status === 'scholarship').length
    const expired = courseEnrolls.filter((e: any) => coursePays[e.id]?.status === 'expired').length

    const hasPaid = paid > 0
    const hasPending = pending > 0

    return `
      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden course-table ${isFree ? 'hidden' : ''}" data-course-id="${escapeHtml(c.id)}" data-has-paid="${hasPaid ? '1' : '0'}" data-has-pending="${hasPending ? '1' : '0'}" data-is-free="${isFree ? '1' : '0'}" data-total-enrolls="${courseEnrolls.length}">
        <div class="flex items-center justify-between bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <div>
            <h3 class="font-heading text-base font-bold text-white">${escapeHtml(c.name)}</h3>
            <p class="text-xs text-zinc-500 mt-0.5">
              ${courseEnrolls.length} inscrito${courseEnrolls.length !== 1 ? 's' : ''}
              ${!isFree ? ` · ${paid} pagados · ${pending} pendientes${scholar > 0 ? ` · ${scholar} becados` : ''}${expired > 0 ? ` · ${expired} vencidos` : ''}` : ' · Gratis'}
            </p>
          </div>
        </div>
        ${rows.length > 0 ? `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="py-2.5 px-3 font-medium">Estudiante</th>
                <th class="py-2.5 px-3 font-medium hidden md:table-cell">Email</th>
                <th class="py-2.5 px-3 font-medium">Plataforma</th>
                <th class="py-2.5 px-3 font-medium">Estado</th>
                <th class="py-2.5 px-3 font-medium text-right">Acci\u00f3n</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : '<p class="px-4 py-6 text-sm text-zinc-500 text-center">Sin estudiantes inscritos.</p>'}
      </div>`
  }).join('')

  document.getElementById('page-content')!.innerHTML = `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <span class="kicker">Administración de pagos</span>
        <h1 class="font-heading text-2xl font-bold text-white">Gesti\u00f3n de Pagos</h1>
      </div>
      <button id="export-payments-csv" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-[#8B5CF6]/50 hover:text-white">
        ${Icon('download', 13)} Exportar Excel
      </button>
    </div>
    <div id="pay-save-bar" class="mb-4 hidden flex items-center justify-between rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-3">
      <span id="pay-changes-count" class="text-sm text-zinc-300">0 cambios pendientes</span>
      <div class="flex gap-2">
        <button id="pay-discard-btn" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Descartar</button>
        <button id="pay-save-btn" class="rounded-lg bg-[#8B5CF6] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 12)} Guardar cambios</button>
      </div>
    </div>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <span class="text-xs text-zinc-500 mr-2">Filtrar:</span>
      <button class="pay-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25" data-filter="paid" data-active="1">
        ${Icon('checkCircle', 14)} Pagados
      </button>
      <button class="pay-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25" data-filter="free" data-active="1">
        ${Icon('checkCircle', 14)} Gratis
      </button>
      <button class="pay-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25" data-filter="pending" data-active="1">
        ${Icon('checkCircle', 14)} Pendientes
      </button>
      <span class="mx-1 text-zinc-700">|</span>
      <span class="text-xs text-zinc-500">Cursos:</span>
      ${filterHtml}
    </div>
    <div class="space-y-4" id="course-tables">${courseTables}</div>`

  // Pay status filter toggles
  const payStatusFilters = new Set(['paid', 'free', 'pending'])
  document.querySelectorAll('.pay-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement
      const filter = el.dataset.filter || ''
      const active = el.dataset.active === '1'
      if (active) payStatusFilters.delete(filter)
      else payStatusFilters.add(filter)
      el.dataset.active = active ? '0' : '1'
      el.classList.toggle('bg-[#8B5CF6]/15', !active)
      el.classList.toggle('text-[#8B5CF6]', !active)
      el.classList.toggle('bg-zinc-800/40', active)
      el.classList.toggle('text-zinc-500', active)
      el.innerHTML = active
        ? `${Icon('plus', 12)} ${filter.charAt(0).toUpperCase() + filter.slice(1)}`
        : `${Icon('checkCircle', 14)} ${filter.charAt(0).toUpperCase() + filter.slice(1)}`
      applyPayFilters()
    })
  })

  function applyPayFilters(): void {
    document.querySelectorAll('.course-table').forEach(table => {
      const el = table as HTMLElement
      const isFree = el.dataset.isFree === '1'
      const hasPaid = el.dataset.hasPaid === '1'
      const hasPending = el.dataset.hasPending === '1'

      const totalEnrolls = parseInt(el.dataset.totalEnrolls || '0')
      const showFree = payStatusFilters.has('free')
      const showPaid = payStatusFilters.has('paid')
      const showPending = payStatusFilters.has('pending')

      let show = true
      if (isFree) show = showFree
      else if (totalEnrolls === 0) show = false
      else {
        show = (hasPaid && showPaid) || (hasPending && showPending) || totalEnrolls > 0
      }

      const courseFilterOn = document.querySelector(`.course-filter-btn[data-course-id="${el.dataset.courseId}"][data-active="1"]`)
      if (!courseFilterOn) show = false

      el.classList.toggle('hidden', !show)
    })
  }

  // Course filter toggles
  document.querySelectorAll('.course-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = (btn as HTMLElement).dataset.courseId
      const active = (btn as HTMLElement).dataset.active === '1'
      ;(btn as HTMLElement).dataset.active = active ? '0' : '1'
      btn.classList.toggle('bg-[#8B5CF6]/15', !active)
      btn.classList.toggle('text-[#8B5CF6]', !active)
      btn.classList.toggle('border-[#8B5CF6]/30', !active)
      btn.classList.toggle('hover:bg-[#8B5CF6]/25', !active)
      btn.classList.toggle('bg-zinc-800/40', active)
      btn.classList.toggle('text-zinc-500', active)
      btn.classList.toggle('border-dashed', active)
      btn.classList.toggle('border-zinc-700/50', active)
      btn.classList.toggle('hover:bg-zinc-700/50', active)
      btn.classList.toggle('hover:text-zinc-300', active)
      btn.innerHTML = active
        ? `${Icon('plus', 12)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`
        : `${Icon('checkCircle', 14)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`
      applyPayFilters()
    })
  })

  // Export payments Excel
  document.getElementById('export-payments-csv')?.addEventListener('click', () => {
    const statusLabel: Record<string, string> = { free: 'Gratis', pending: 'Pendiente', paid: 'Pagado', scholarship: 'Beca', expired: 'Vencido' }
    const rowsData = (enrolls ?? []).map((e: any) => {
      const prof = e.profiles || {}
      const pay = payByCourseEnroll[e.course_id]?.[e.id]
      const payUsd = Number(pay?.paid_usd || 0)
      const owed = pay && pay.status !== 'paid' ? Math.max(0, Number(pay.amount ?? 15) - payUsd) : 0
      return [
        prof.full_name || 'Desconocido',
        prof.email || '',
        prof.platform === 'mobile' ? 'Mobile' : 'PC',
        statusLabel[pay?.status] ?? 'Sin pago',
        payUsd > 0 ? fmtUsd(owed) : (owed > 0 ? fmtUsd(owed) : ''),
      ]
    })
    exportExcel(`pagos-${new Date().toISOString().slice(0, 10)}.xls`, 'Pagos', ['Estudiante', 'Email', 'Plataforma', 'Estado', 'Deuda USD'], rowsData)
  })

  // Save/Discard bar for pending payment changes
  function updateSaveBar(): void {
    const bar = document.getElementById('pay-save-bar')
    const countEl = document.getElementById('pay-changes-count')
    if (!bar || !countEl) return
    const count = pendingChanges.length
    if (count > 0) {
      bar.classList.remove('hidden')
      countEl.textContent = `${count} cambio${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}`
    } else {
      bar.classList.add('hidden')
    }
  }

  document.getElementById('pay-save-btn')?.addEventListener('click', async () => {
    const saveBtn = document.getElementById('pay-save-btn') as HTMLButtonElement
    const changes = [...pendingChanges]
    if (changes.length === 0) return
    saveBtn.disabled = true
    saveBtn.textContent = 'Guardando...'
    let ok = 0, fail = 0
    for (const c of changes) {
      const payUpdate: Record<string, any> = {
        status: c.newStatus,
        paid_at: c.newStatus === 'paid' ? new Date().toISOString() : null,
      }
      if (c.newStatus === 'pending') payUpdate.created_at = new Date().toISOString()
      const { error } = await supabase.from('payments').update(payUpdate).eq('id', c.paymentId)
      if (error) { fail++ } else {
        ok++
        // Sync scholarship
        if (c.newStatus === 'scholarship' && c.profileId) {
          await supabase.from('profiles').update({ scholarship: true }).eq('id', c.profileId)
        } else if (c.oldStatus === 'scholarship' && c.profileId) {
          const { data: otherScholarships } = await supabase.from('payments').select('id').eq('profile_id', c.profileId).eq('status', 'scholarship').neq('id', c.paymentId)
          if (!otherScholarships || otherScholarships.length === 0) await supabase.from('profiles').update({ scholarship: false }).eq('id', c.profileId)
        }
        // Auto-enroll in general courses when payment becomes paid
        if (c.newStatus === 'paid' && c.profileId) {
          autoEnrollGeneralCourses(c.profileId, 'student')
          autoEnrollComplementaria(c.profileId, 'student')
        }
      }
    }
    pendingChanges = []
    updateSaveBar()
    saveBtn.disabled = false
    saveBtn.innerHTML = `${Icon('save', 12)} Guardar cambios`
    if (fail > 0) toast('warning', `${ok} guardados, ${fail} errores`)
    else toast('success', `${ok} cambio${ok !== 1 ? 's' : ''} guardado${ok !== 1 ? 's' : ''}`)
    await renderCoachPayments()
  })

  document.getElementById('pay-discard-btn')?.addEventListener('click', () => {
    pendingChanges = []
    renderCoachPayments()
  })

  const abonoModalHtml = `
    <div id="abono-modal" class="fixed inset-0 z-50 hidden overflow-y-auto bg-black/60" role="dialog" aria-modal="true" aria-label="Registrar abono">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-xl p-6">
          <h3 class="mb-1 font-heading text-lg font-bold text-white">Registrar abono</h3>
          <p class="mb-4 text-xs text-zinc-500">El monto se convierte a dólares automáticamente para calcular lo que queda debiendo.</p>
          <form id="abono-form">
            <input type="hidden" name="paymentId">
            <input type="hidden" name="fee">
            <div class="mb-4">
              <label for="abono-currency" class="mb-1 block text-xs font-medium text-zinc-400">Moneda en la que pagó</label>
              <select id="abono-currency" name="currency"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                ${CURRENCIES.map(c => `<option value="${c.code}">${escapeHtml(c.name)} (${c.code})</option>`).join('')}
              </select>
            </div>
            <div class="mb-4">
              <label for="abono-amount" class="mb-1 block text-xs font-medium text-zinc-400">Monto que pagó</label>
              <input id="abono-amount" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" required>
            </div>
            <p id="abono-preview" class="mb-4 rounded-lg bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">—</p>
            <p id="abono-error" class="mb-3 hidden text-sm text-red-400"></p>
            <div class="flex gap-3">
              <button type="submit" id="abono-save-btn"
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Guardar abono</button>
              <button type="button" id="abono-close-btn"
                class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>`
  document.getElementById('modal-root')!.insertAdjacentHTML('beforeend', abonoModalHtml)

  const abonoCurrencySel = document.getElementById('abono-currency') as HTMLSelectElement | null
  if (abonoCurrencySel) abonoCurrencySel.value = guessCurrencyCode()

  document.getElementById('abono-close-btn')?.addEventListener('click', () => {
    document.getElementById('abono-modal')!.classList.add('hidden')
  })

  let fxRates: Record<string, number> | null = getCachedRates()
  if (!fxRates) {
    try { fxRates = await fetchRates() } catch { fxRates = null }
  }

  const updateAbonoPreview = () => {
    const feeEl = document.getElementById('abono-form')?.querySelector<HTMLInputElement>('input[name="fee"]')
    const fee = Number(feeEl?.value || 0)
    const amount = Number((document.getElementById('abono-amount') as HTMLInputElement)?.value)
    const currency = abonoCurrencySel?.value || 'USD'
    const preview = document.getElementById('abono-preview')!
    if (!amount || amount <= 0) { preview.innerHTML = '—'; return }
    if (!fxRates) {
      preview.innerHTML = '<span class="text-red-400">No se pudo obtener la tasa de cambio. Reintenta más tarde.</span>'
      return
    }
    const usd = toUsd(amount, currency, fxRates)
    if (usd === null) {
      preview.innerHTML = `<span class="text-red-400">Sin tasa para ${escapeHtml(currency)}.</span>`
      return
    }
    const curOpt = CURRENCIES.find(c => c.code === currency)
    const sym = curOpt?.symbol || ''
    const total = usd >= fee
    preview.innerHTML = `
      ≈ <span class="font-bold text-white">$${usd.toFixed(2)}</span> USD (${escapeHtml(curOpt?.name || currency)})
      ${total
        ? `<span class="block mt-1 text-green-400">Cubre la cuota de ${fmtUsd(fee)} — quedará Pagado.</span>`
        : `<span class="block mt-1 text-amber-400">Quedará debiendo <span class="font-bold">${fmtUsd(fee - usd)}</span> de ${fmtUsd(fee)}.</span>`}`
  }

  document.getElementById('abono-amount')?.addEventListener('input', updateAbonoPreview)
  abonoCurrencySel?.addEventListener('change', updateAbonoPreview)

  document.getElementById('abono-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const paymentId = fd.get('paymentId') as string
    const fee = Number(fd.get('fee') || 0)
    const currency = fd.get('currency') as string
    const amount = Number(fd.get('amount') || 0)
    const errEl = document.getElementById('abono-error')!
    if (!paymentId || !amount || amount <= 0) {
      errEl.textContent = 'Ingresa un monto válido.'
      errEl.classList.remove('hidden')
      return
    }
    if (!fxRates) {
      errEl.textContent = 'No se pudo obtener la tasa de cambio. Intenta de nuevo.'
      errEl.classList.remove('hidden')
      return
    }
    const usd = toUsd(amount, currency, fxRates)
    if (usd === null) {
      errEl.textContent = `No hay tasa disponible para ${currency}.`
      errEl.classList.remove('hidden')
      return
    }
    const saveBtn = document.getElementById('abono-save-btn') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.textContent = 'Guardando...'
    const { data: existing } = await supabase.from('payments').select('paid_usd').eq('id', paymentId).maybeSingle()
    const prevUsd = Number(existing?.paid_usd || 0)
    const totalUsd = prevUsd + usd
    const update: Record<string, any> = {
      paid_amount: amount,
      currency,
      paid_usd: Math.min(fee, Math.round(totalUsd * 100) / 100),
    }
    if (totalUsd >= fee - 0.001) {
      update.status = 'paid'
      update.paid_at = new Date().toISOString()
    } else {
      update.paid_at = null
    }
    const { error } = await supabase.from('payments').update(update).eq('id', paymentId)
    if (error) {
      errEl.textContent = error.message
      errEl.classList.remove('hidden')
      saveBtn.disabled = false
      saveBtn.textContent = 'Guardar abono'
      return
    }
    toast(update.status === 'paid' ? 'success' : 'info', update.status === 'paid' ? 'Abono registrado — pago completo. Estado: Pagado' : 'Abono registrado')
    document.getElementById('abono-modal')!.classList.add('hidden')
    await renderCoachPayments()
  })

  // Global modal event handler (delegated, survives DOM changes)
  if ((window as any).__payClickHandler) {
    document.removeEventListener('click', (window as any).__payClickHandler)
  }
  const payClickHandler = async (e: Event) => {
    const target = e.target as HTMLElement

    // Pay status select - track changes only (no auto-save)
    const sel = target.closest('.pay-status-select') as HTMLSelectElement
    if (sel) {
      const newStatus = sel.value
      const paymentId = sel.dataset.paymentId
      const profileId = sel.dataset.profileId
      const oldStatus = sel.dataset.oldStatus || ''
      if (!paymentId) return
      sel.dataset.newStatus = newStatus
      // Show preview badge
      const badgeSpan = sel.closest('.flex')?.querySelector<HTMLElement>('[class*="rounded-full"][class*="bg-"]')
      if (badgeSpan) {
        const lbls: Record<string, string> = { pending: 'Pendiente', paid: 'Pagado', scholarship: 'Beca', expired: 'Vencido' }
        const cls: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-400', paid: 'bg-green-500/20 text-green-400', scholarship: 'bg-blue-500/20 text-blue-400', expired: 'bg-red-500/20 text-red-400' }
        badgeSpan.textContent = lbls[newStatus] || newStatus
        badgeSpan.className = 'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ' + (cls[newStatus] || 'text-zinc-500')
      }
      // Track changes
      const idx = pendingChanges.findIndex((c: any) => c.paymentId === paymentId)
      if (newStatus !== oldStatus) {
        const change = { paymentId, profileId, newStatus, oldStatus }
        if (idx >= 0) pendingChanges[idx] = change
        else pendingChanges.push(change)
      } else {
        if (idx >= 0) pendingChanges.splice(idx, 1)
      }
      // Update save bar
      updateSaveBar()
      return
    }

    // Abono (pago parcial) button
    const abonoBtn = target.closest('.pay-abono-btn') as HTMLElement
    if (abonoBtn) {
      e.preventDefault()
      const paymentId = abonoBtn.dataset.paymentId
      const fee = abonoBtn.dataset.fee
      if (!paymentId) return
      const modal = document.getElementById('abono-modal')!
      modal.querySelector<HTMLInputElement>('input[name="paymentId"]')!.value = paymentId
      modal.querySelector<HTMLInputElement>('input[name="fee"]')!.value = fee || ''
      ;(document.getElementById('abono-amount') as HTMLInputElement).value = ''
      document.getElementById('abono-preview')!.innerHTML = '—'
      modal.classList.remove('hidden')
      return
    }

    // Create payment button
    const createBtn = target.closest('.create-payment-btn') as HTMLElement
    if (createBtn) {
      e.preventDefault()
      const profileId = createBtn.dataset.profileId
      const enrollmentId = createBtn.dataset.enrollmentId
      const role = createBtn.dataset.role
      if (!profileId) return
      const { data: profile } = await supabase.from('profiles').select('scholarship').eq('id', profileId).maybeSingle()
      const { data: firstEnroll } = await supabase.from('enrollments').select('course_id').eq('profile_id', profileId).limit(1).maybeSingle()
      let payAmount = 15
      if (firstEnroll) {
        const { data: courseRow } = await supabase.from('courses').select('price').eq('id', firstEnroll.course_id).maybeSingle()
        if (courseRow) payAmount = courseRow.price ?? 15
      }
      const { data: existingPay } = await supabase.from('payments').select('id').eq('profile_id', profileId).eq('enrollment_id', enrollmentId).maybeSingle()
      if (existingPay) { toast('error', 'Este estudiante ya tiene un pago para esta inscripción'); return }
      const payStatus = payAmount === 0 ? 'free' : (profile?.scholarship ? 'scholarship' : 'pending')
      await supabase.from('payments').insert({ profile_id: profileId, enrollment_id: enrollmentId || undefined, type: role || 'student', status: payStatus, amount: payAmount })
      toast('success', 'Pago creado')
      renderCoachPayments()
      return
    }

    // Notify payment reminder (notifications removed)
    const notifyBtn = target.closest('.notify-payment-btn') as HTMLElement
    if (notifyBtn) {
      e.preventDefault()
      toast('success', 'Recordatorio enviado al estudiante')
      return
    }
  }
  document.addEventListener('click', payClickHandler)
  ;(window as any).__payClickHandler = payClickHandler
}
