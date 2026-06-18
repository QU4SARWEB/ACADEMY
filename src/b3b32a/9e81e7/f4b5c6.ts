import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderNewTicket(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initNewTicket(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const html = `
      <div class="max-w-2xl">
        <a href="#/support" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a tickets
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nuevo ticket de soporte</h1>

        <form id="ticket-form" class="glass space-y-4 rounded-xl p-6">
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-400">Asunto</label>
            <input type="text" name="subject" required maxlength="200" placeholder="Resume tu problema..."
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-400">Descripción</label>
            <textarea name="body" rows="6" required placeholder="Describe tu problema en detalle..."
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-zinc-400">Prioridad</label>
              <select name="priority"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="low">Baja</option>
                <option value="medium" selected>Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <p id="ticket-error" class="hidden text-xs text-red-400"></p>
          <button type="submit"
            class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            ${Icon('arrowUpRight', 14)} Enviar ticket
          </button>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('ticket-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const { error } = await supabase.from('support_tickets').insert({
        profile_id: session.user.id,
        subject: fd.get('subject') as string,
        body: fd.get('body') as string,
        priority: fd.get('priority') as string || 'medium',
      })
      if (error) {
        document.getElementById('ticket-error')!.textContent = error.message
        document.getElementById('ticket-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Ticket creado correctamente')
        router.navigate('/support')
      }
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
