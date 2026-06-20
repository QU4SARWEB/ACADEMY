import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderPracticalExams(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initPracticalExams(): Promise<void> {
  try {
    const { data: exams } = await supabase.from('practical_exams').select('*, courses!inner(name)').order('created_at', { ascending: false })
    const statusBadge: Record<string, string> = { draft: 'bg-yellow-500/20 text-yellow-400', active: 'bg-green-500/20 text-green-400', closed: 'bg-zinc-500/20 text-zinc-400' }
    const statusLabel: Record<string, string> = { draft: 'Borrador', active: 'Activo', closed: 'Cerrado' }
    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div><h1 class="font-heading text-2xl font-bold text-white">Exámenes Prácticos</h1><p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes</p></div>
        <a href="#/coaches/exams/practical/new" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo práctico</a>
      </div>
      ${(exams ?? []).length === 0 ? '<p class="text-sm text-zinc-500">No hay exámenes prácticos.</p>' : '<div class="space-y-3">' + (exams ?? []).map((e: any) => {
        const courseName = e.courses?.name || ''
        return '<div class="glass rounded-xl p-4 flex items-center justify-between"><div><div class="flex items-center gap-2"><h3 class="font-medium text-white">' + escapeHtml(e.title) + '</h3><span class="rounded-full px-2 py-0.5 text-[10px] ' + (statusBadge[e.status] || '') + '">' + (statusLabel[e.status] || e.status) + '</span></div><p class="mt-1 text-xs text-zinc-500">' + escapeHtml(courseName) + ' · ' + formatDate(e.created_at) + '</p></div><div class="flex gap-2">' + (e.status === 'draft' ? '<a href="#/coaches/exams/practical/' + e.id + '" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('edit', 12) + ' Iniciar</a>' : '<a href="#/coaches/exams/practical/' + e.id + '" class="rounded-lg bg-[#8B5CF6]/20 px-3 py-1.5 text-xs text-[#8B5CF6] hover:bg-[#8B5CF6]/30">' + Icon('edit', 12) + ' Puntuación</a>') + '<button class="del-practical-btn rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30" data-id="' + e.id + '">' + Icon('trash', 12) + '</button></div></div>'
      }).join('') + '</div>'}`
    document.querySelectorAll('.del-practical-btn').forEach(btn => { btn.addEventListener('click', async () => { const id = (btn as HTMLElement).dataset.id; if (!id || !(await confirmDialog('¿Eliminar este examen práctico?'))) return; await supabase.from('practical_exams').delete().eq('id', id); window.location.reload() }) })
  } catch (err) { console.error(err); document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error</p>' }
}
