import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'

export function renderPracticalNew(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initPracticalNew(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const coachId = session?.user?.id
    const { data: courses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const { data: templates } = await supabase.from('coach_rubric_templates').select('*').eq('coach_id', coachId || '').order('created_at', { ascending: false })

    let criteria: { name: string; max: number }[] = [{ name: 'Aim', max: 10 }, { name: 'Comunicación', max: 10 }]
    function renderCriteria() {
      const container = document.getElementById('criteria-list')
      if (!container) return
      container.innerHTML = criteria.map((c, i) => '<div class="flex gap-2 items-center"><input type="text" class="criteria-name flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" value="' + escapeHtml(c.name) + '" placeholder="Nombre" /><input type="number" class="criteria-max w-20 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" value="' + c.max + '" min="1" max="100" /><button type="button" class="remove-criteria text-zinc-600 hover:text-red-400" data-idx="' + i + '">&times;</button></div>').join('')
    }

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6"><a href="#/coaches/exams/practical" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver</a><h1 class="font-heading text-2xl font-bold text-white">Nuevo examen práctico</h1></div>
      <div class="flex gap-6 items-start">
        <div class="w-[500px] shrink-0">
          <div class="glass rounded-xl p-6">
            <h2 class="font-heading text-base font-bold text-white mb-4">Datos del examen</h2>
            <div class="space-y-3">
              <div><label class="mb-1 block text-sm text-zinc-400">Curso</label><select id="p-course" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">' + (courses ?? []).map((c: any) => '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>').join('') + '</select></div>
              <div><label class="mb-1 block text-sm text-zinc-400">Título</label><input id="p-title" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
              <div><label class="mb-1 block text-sm text-zinc-400">Descripción</label><textarea id="p-desc" rows="3" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="p-ot" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" /> <span class="text-sm text-zinc-300">Habilitar Overtime</span></label>
            </div>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="glass rounded-xl p-6">
            <div class="flex items-center justify-between mb-4"><h2 class="font-heading text-base font-bold text-white">Rúbricas</h2><div class="flex gap-2">' + ((templates ?? []).length > 0 ? '<select id="load-template" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-[#8B5CF6]"><option value="">Cargar plantilla...</option>' + (templates ?? []).map((t: any) => '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>').join('') + '</select>' : '') + '<button type="button" id="add-criteria" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('plus', 12) + ' Agregar</button></div></div>
            <div id="criteria-list" class="space-y-2 mb-3"></div>
            <p class="text-xs text-zinc-500 mb-3">Cada rúbrica tiene Fase 1 y Fase 2' + ('' ? ' + Overtime' : '') + '</p>
            <button type="button" id="save-template" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white mr-2">${Icon('save', 12)} Guardar plantilla</button>
            <button type="button" id="create-practical" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 14)} Crear examen práctico</button>
            <p id="p-error" class="mt-2 hidden text-xs text-red-400"></p>
          </div>
        </div>
      </div>`

    renderCriteria()

    document.getElementById('add-criteria')?.addEventListener('click', () => { criteria.push({ name: '', max: 10 }); renderCriteria() })
    document.getElementById('criteria-list')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.remove-criteria') as HTMLElement
      if (!btn) return; const idx = parseInt(btn.dataset.idx || ''); if (idx >= 0 && idx < criteria.length) { criteria.splice(idx, 1); renderCriteria() }
    })
    document.getElementById('criteria-list')?.addEventListener('change', () => {
      const inputs = document.querySelectorAll('.criteria-name'); const maxInputs = document.querySelectorAll('.criteria-max')
      criteria = Array.from(inputs).map((inp, i) => ({ name: (inp as HTMLInputElement).value, max: parseFloat((maxInputs[i] as HTMLInputElement).value) || 10 }))
    })

    document.getElementById('save-template')?.addEventListener('click', async () => {
      const name = prompt('Nombre de la plantilla:')
      if (!name || !coachId) return
      const inputs = document.querySelectorAll('.criteria-name'); const maxInputs = document.querySelectorAll('.criteria-max')
      const c = Array.from(inputs).map((inp, i) => ({ name: (inp as HTMLInputElement).value || 'Criterio ' + (i + 1), max: parseFloat((maxInputs[i] as HTMLInputElement).value) || 10 }))
      await supabase.from('coach_rubric_templates').insert({ coach_id: coachId, name, criteria: c })
      toast('success', 'Plantilla guardada')
    })

    document.getElementById('load-template')?.addEventListener('change', async (e) => {
      const id = (e.target as HTMLSelectElement).value; if (!id) return
      const { data: t } = await supabase.from('coach_rubric_templates').select('criteria').eq('id', id).maybeSingle()
      if (t) { criteria = (t as any).criteria || []; renderCriteria() }
    })

    document.getElementById('create-practical')?.addEventListener('click', async () => {
      const errEl = document.getElementById('p-error')!
      const courseId = (document.getElementById('p-course') as HTMLSelectElement).value
      const title = (document.getElementById('p-title') as HTMLInputElement).value.trim()
      const description = (document.getElementById('p-desc') as HTMLTextAreaElement).value.trim()
      const hasOT = (document.getElementById('p-ot') as HTMLInputElement).checked
      if (!courseId) { errEl.textContent = 'Selecciona un curso'; errEl.classList.remove('hidden'); return }
      if (!title) { errEl.textContent = 'Escribe un título'; errEl.classList.remove('hidden'); return }
      const inputs = document.querySelectorAll('.criteria-name'); const maxInputs = document.querySelectorAll('.criteria-max')
      const c = Array.from(inputs).map((inp, i) => ({ name: (inp as HTMLInputElement).value || 'Criterio ' + (i + 1), max: parseFloat((maxInputs[i] as HTMLInputElement).value) || 10 })).filter(x => x.name)
      if (c.length < 1) { errEl.textContent = 'Agrega al menos 1 rúbrica'; errEl.classList.remove('hidden'); return }
      const { data: exam, error } = await supabase.from('practical_exams').insert({ course_id: courseId, title, description, has_overtime: hasOT, status: 'draft' }).select().maybeSingle()
      if (error || !exam) { errEl.textContent = error?.message || 'Error'; errEl.classList.remove('hidden'); return }
      for (let i = 0; i < c.length; i++) { await supabase.from('practical_rubrics').insert({ practical_exam_id: exam.id, name: c[i].name, max_score: c[i].max, order_num: i }) }
      toast('success', 'Examen práctico creado'); window.location.hash = '#/coaches/exams/practical/' + exam.id
    })
  } catch (err) { console.error(err); document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error</p>' }
}
