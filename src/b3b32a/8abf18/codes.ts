import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachCodes(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachCodes(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const uid = session.user.id

    const { data: codes } = await supabase
      .from('referral_codes')
      .select('*, used_by_profiles:profiles!used_by(full_name)')
      .eq('coach_id', uid)
      .order('created_at', { ascending: false })

    const codesHtml = (codes ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No has generado c\u00f3digos de referido todav\u00eda.</p>'
      : (codes ?? []).map((c: any) => {
          const used = !!c.used_by
          const usedName = c.used_by_profiles?.full_name || ''
          return `
          <div class="flex items-center justify-between rounded-lg border ${used ? 'border-zinc-800 bg-zinc-900/30' : 'border-[#8B5CF6]/30 bg-[#8B5CF6]/5'} px-4 py-3">
            <div class="flex items-center gap-3">
              <code class="rounded bg-zinc-800 px-2.5 py-1 text-sm font-mono font-bold text-white select-all">${escapeHtml(c.code)}</code>
              ${used
                ? '<span class="text-xs text-zinc-500">Usado por ' + escapeHtml(usedName) + '</span>'
                : '<span class="text-xs text-green-400">Disponible</span>'
              }
            </div>
            <div class="flex gap-2">
              ${!used ? `
              <button class="copy-code-btn text-xs text-zinc-400 hover:text-white transition" data-code="${escapeHtml(c.code)}">${Icon('copy', 14)}</button>
              <button class="delete-code-btn text-xs text-red-400 hover:text-red-300 transition" data-id="${escapeHtml(c.id)}">${Icon('trash', 14)}</button>` : ''}
            </div>
          </div>`
        }).join('')

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">C\u00f3digos de referido</h1>
          <p class="mt-1 text-sm text-zinc-500">Comparte estos c\u00f3digos con nuevos coaches. Al registrarse con tu c\u00f3digo, la persona se convertir\u00e1 en coach autom\u00e1ticamente. Cada c\u00f3digo tiene un solo uso.</p>
        </div>
        <button id="btn-generate-code" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition">${Icon('plus', 14)} Generar c\u00f3digo</button>
      </div>
      <div class="rounded-xl border border-zinc-800 bg-[#111] p-5">
        <div id="codes-list" class="space-y-2">${codesHtml}</div>
      </div>`

    document.getElementById('btn-generate-code')?.addEventListener('click', async () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const { error } = await supabase.from('referral_codes').insert({
        code, coach_id: uid, is_active: true,
      })
      if (error) { toast('error', error.message); return }
      toast('success', 'C\u00f3digo ' + code + ' generado')
      initCoachCodes()
    })

    document.getElementById('codes-list')?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const copyBtn = target.closest('.copy-code-btn') as HTMLElement
      if (copyBtn) {
        const code = copyBtn.dataset.code
        if (code) {
          try {
            await navigator.clipboard.writeText(code)
            toast('success', 'C\u00f3digo copiado: ' + code)
          } catch { toast('error', 'No se pudo copiar') }
        }
        return
      }
      const deleteBtn = target.closest('.delete-code-btn') as HTMLElement
      if (deleteBtn) {
        const id = deleteBtn.dataset.id
        if (!(await confirmDialog('\u00bfEliminar este c\u00f3digo permanentemente?'))) return
        const { error } = await supabase.from('referral_codes').delete().eq('id', id)
        if (error) { toast('error', error.message); return }
        toast('success', 'C\u00f3digo eliminado')
        initCoachCodes()
      }
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar c\u00f3digos</p>'
  }
}
