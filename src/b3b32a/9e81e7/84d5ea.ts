import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderPayments(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPayments(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: payments } = await supabase
      .from('payments')
      .select('*, seasons(name)')
      .eq('profile_id', session.user.id)
      .order('created_at', { ascending: false })

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name), seasons(name, id)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    const statusColors: Record<string, string> = { pending: 'text-yellow-400', paid: 'text-green-400', scholarship: 'text-blue-400', expired: 'text-red-400' }

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
            <div class="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <p class="text-sm text-white">${escapeHtml(p.seasons?.name || 'Pago')}</p>
                <p class="text-xs text-zinc-500">${p.due_date ? formatDate(p.due_date) : ''} ${p.paid_at ? '· Pagado: ' + formatDate(p.paid_at) : ''}</p>
              </div>
              <div class="text-right">
                <span class="text-xs ${statusColors[p.status] || 'text-zinc-500'}">${escapeHtml(p.status)}</span>
                ${p.amount ? `<p class="text-xs text-zinc-400">$${p.amount}</p>` : ''}
              </div>
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) { console.error(err); document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar pagos</p>' }
}
