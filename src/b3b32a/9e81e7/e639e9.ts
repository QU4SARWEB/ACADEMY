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

const PAYPAL_CLIENT_ID = 'ATf2cJdAcCmle4LgS5r851NRL1k4bLiqhadr9ZSPxzeadYyMDmuGDHqj1g4FcpSZ3ULeisdy_m8JGvbS'
const PAYPAL_SANDBOX = true // false = live, true = sandbox

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
  const { data: payments } = await supabase
    .from('payments')
    .select('*, seasons(name)')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(name), seasons(name, id)')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

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
      ${(payments ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">No hay pagos registrados.</p>'
        : (payments ?? []).map((p: any) => `
          <div class="payment-item glass rounded-xl p-4 space-y-3" data-payment-id="${escapeHtml(p.id)}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">${escapeHtml(p.seasons?.name || 'Pago')}</p>
              <p class="text-xs text-zinc-500">${p.due_date ? formatDate(p.due_date) : ''} ${p.paid_at ? '· Pagado: ' + formatDate(p.paid_at) : ''}</p>
            </div>
            ${p.status === 'scholarship'
              ? `<span class="shrink-0 text-sm font-medium text-blue-400">${statusLabels.scholarship}</span>`
              : `<span class="shrink-0 text-sm font-medium ${statusColors[p.status] || 'text-zinc-500'}">${statusLabels[p.status] || escapeHtml(p.status)} $${p.amount ?? 1.00}</span>`
            }
          </div>
          ${p.status === 'pending' ? `
          <div class="flex flex-col gap-2">
            <div class="paypal-btn-container" data-paypal-id="${escapeHtml(p.id)}" data-amount="${p.amount ?? 1.00}"></div>
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
      }
    </div>

    <div id="receipt-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
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

    const url = await uploadFileFromInput('receipts', paymentId, 'receipts', file)
    if (!url) {
      const errEl = document.getElementById('receipt-error')!
      errEl.textContent = 'Error al subir el comprobante'
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

  let paymentsQuery = supabase
    .from('payments')
    .select('*, seasons(name), profiles(full_name, email, avatar_url)')
    .order('created_at', { ascending: false })

  if (filterSeasonId) {
    paymentsQuery = paymentsQuery.eq('season_id', filterSeasonId)
  }

  const { data: payments } = await paymentsQuery

  const { count: sCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')

  const { count: pCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'player')

  const paymentList = payments ?? []
  const totalStudents = (sCount ?? 0) + (pCount ?? 0)
  const paidCount = paymentList.filter((p: any) => p.status === 'paid').length
  const pendingCount = paymentList.filter((p: any) => p.status === 'pending').length
  const scholarshipCount = paymentList.filter((p: any) => p.status === 'scholarship').length

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    paid: 'text-green-400 bg-green-500/10 border-green-500/30',
    scholarship: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    expired: 'text-red-400 bg-red-500/10 border-red-500/30',
  }

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

    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="glass rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-white">${totalStudents}</p>
        <p class="text-xs text-zinc-500">Total estudiantes/players</p>
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
              <th class="px-4 py-3 text-left font-medium text-zinc-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${paymentList.length === 0
              ? '<tr><td colspan="8" class="px-4 py-8 text-center text-zinc-500">No hay pagos registrados.</td></tr>'
              : paymentList.map((p: any) => `
                <tr class="border-b border-zinc-800/50 hover:bg-zinc-800/20" data-payment-id="${escapeHtml(p.id)}">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                        ${p.profiles?.avatar_url
                          ? `<img src="${escapeHtml(p.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : (p.profiles?.full_name?.charAt(0) ?? '?')
                        }
                      </div>
                      <div>
                        <p class="font-medium text-white">${escapeHtml(p.profiles?.full_name || 'Desconocido')}</p>
                        <p class="text-xs text-zinc-500">${escapeHtml(p.profiles?.email || '')}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-zinc-300">${escapeHtml(p.seasons?.name || '—')}</td>
                  <td class="px-4 py-3 capitalize text-zinc-300">${escapeHtml(p.type || '—')}</td>
                  <td class="px-4 py-3 text-zinc-300">${p.amount ? '$' + p.amount : '—'}</td>
                  <td class="px-4 py-3">
                    <span class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || 'text-zinc-500'}">
                      ${escapeHtml(p.status)}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    ${p.receipt_url
                      ? `<a href="${escapeHtml(p.receipt_url)}" target="_blank" class="text-xs text-[#8B5CF6] hover:underline">Ver comprobante</a>`
                      : '<span class="text-xs text-zinc-600">—</span>'
                    }
                  </td>
                  <td class="px-4 py-3 text-xs text-zinc-500">${p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                  <td class="px-4 py-3">
                    <select class="pay-status-select rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none" data-payment-id="${escapeHtml(p.id)}">
                      <option value="pending" ${p.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                      <option value="paid" ${p.status === 'paid' ? 'selected' : ''}>Pagado</option>
                      <option value="scholarship" ${p.status === 'scholarship' ? 'selected' : ''}>Beca</option>
                      <option value="expired" ${p.status === 'expired' ? 'selected' : ''}>Vencido</option>
                    </select>
                  </td>
                </tr>
              `).join('')
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
      const paymentId = select.dataset.paymentId
      if (!paymentId) return

      const updateData: Record<string, any> = { status: newStatus }
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString()
      if (newStatus !== 'paid') updateData.paid_at = null

      await supabase.from('payments').update(updateData).eq('id', paymentId)
      renderCoachPayments()
    })
  })
}
