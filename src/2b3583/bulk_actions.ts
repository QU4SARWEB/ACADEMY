import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function initBulkActions(
  container: HTMLElement,
  options: {
    role: 'student' | 'player'
    afterAction?: () => void
  }
): void {
  const { role, afterAction } = options

  function getSelectedIds(): string[] {
    return Array.from(container.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')).map(cb => cb.value)
  }

  function updateBulkBar(): void {
    const bar = container.querySelector('#bulk-action-bar')
    const count = container.querySelector('#bulk-count')
    if (!bar || !count) return
    const ids = getSelectedIds()
    count.textContent = String(ids.length)
    bar.classList.toggle('hidden', ids.length === 0)
  }

  function updateSelectAll(): void {
    const selectAll = container.querySelector<HTMLInputElement>('#select-all')
    if (!selectAll) return
    const checkboxes = container.querySelectorAll<HTMLInputElement>('.row-checkbox')
    selectAll.checked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked)
    selectAll.indeterminate = !selectAll.checked && Array.from(checkboxes).some(cb => cb.checked)
  }

  container.querySelector('#select-all')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked
    container.querySelectorAll<HTMLInputElement>('.row-checkbox').forEach(cb => cb.checked = checked)
    updateBulkBar()
  })

  container.addEventListener('change', (e) => {
    const target = e.target as HTMLElement
    if (target.matches('.row-checkbox')) {
      updateBulkBar()
      updateSelectAll()
    }
  })

  container.querySelector('#bulk-scholarship')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    if (!await confirmDialog(`¿Dar beca a ${ids.length} ${role === 'student' ? 'alumno' : 'jugador'}${ids.length !== 1 ? 's' : ''}?`)) return
    for (const id of ids) {
      await supabase.from('profiles').update({ scholarship: true }).eq('id', id)
      await supabase.from('payments').update({ status: 'scholarship' }).eq('profile_id', id).eq('status', 'pending')
    }
    toast('success', `Beca asignada a ${ids.length} ${role === 'student' ? 'alumno' : 'jugador'}${ids.length !== 1 ? 's' : ''}`)
    afterAction?.()
  })

  container.querySelector('#bulk-unscholarship')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    if (!await confirmDialog(`¿Quitar beca a ${ids.length} ${role === 'student' ? 'alumno' : 'jugador'}${ids.length !== 1 ? 's' : ''}?`)) return
    for (const id of ids) {
      await supabase.from('profiles').update({ scholarship: false }).eq('id', id)
      await supabase.from('payments').update({ status: 'pending' }).eq('profile_id', id).eq('status', 'scholarship')
    }
    toast('success', `Beca quitada a ${ids.length} ${role === 'student' ? 'alumno' : 'jugador'}${ids.length !== 1 ? 's' : ''}`)
    afterAction?.()
  })

  container.querySelector('#bulk-delete')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    if (!await confirmDialog(`¿Desactivar ${ids.length} ${role === 'student' ? 'alumno' : 'jugador'}${ids.length !== 1 ? 's' : ''}?`)) return
    for (const id of ids) {
      await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    }
    toast('success', `${ids.length} ${role === 'student' ? 'alumno' : 'jugador'}${ids.length !== 1 ? 's' : ''} desactivado${ids.length !== 1 ? 's' : ''}`)
    afterAction?.()
  })
}
