import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

export function renderCoachCourseDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachCourseDetail(): void {
  const params = router.getParams()
  const id = params.id
  if (!id) return

  ;(async () => {
    try {
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!course) {
        document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
        return
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, profiles(full_name, display_name)')
        .eq('course_id', id)
        .eq('status', 'active')

      const html = `
        ${Breadcrumb([
          { label: 'Cursos', href: '#/coaches/courses' },
          { label: (course as any).name || 'Detalle' },
        ])}
        <div class="flex items-center justify-between">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((course as any).name)}</h1>
              <p class="mt-1 text-sm text-zinc-500">
                ${(course as any).duration_months} meses · Rango mínimo: ${escapeHtml((course as any).min_rank)}${(course as any).price && (course as any).price > 0 ? ` · $${(course as any).price}/mes` : ' · Gratis'}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/coaches/courses/${escapeHtml(id)}/edit"
                class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">${Icon('edit', 14)} Editar</a>
              <button id="delete-course-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)}</button>
            </div>
          </div>
        </div>

        ${(course as any).description ? `<div class="glass mb-6 rounded-xl p-4 text-sm text-zinc-300">${escBr((course as any).description)}</div>` : ''}

        <div>
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Estudiantes inscritos (${(enrollments ?? []).length})</h2>
          <div class="space-y-2">
            ${(enrollments ?? []).length === 0
              ? '<p class="text-sm text-zinc-500">No hay estudiantes inscritos.</p>'
              : (enrollments ?? []).map((e: any) => {
                  const name = e.profiles?.display_name || e.profiles?.full_name || 'Desconocido'
                  return `
                    <div class="glass rounded-lg px-4 py-3 flex items-center justify-between">
                      <span class="text-sm text-white">${escapeHtml(name)}</span>
                      <span class="text-xs text-zinc-500">${escapeHtml(e.status)}</span>
                    </div>`
                }).join('')
            }
          </div>
        </div>

        <div class="mt-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-heading text-lg font-bold text-white">Clases</h2>
            <button id="btn-add-class" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 16)} Nueva clase</button>
          </div>

          <div id="class-form-area" class="hidden mb-6">
            <div class="glass rounded-xl p-6">
              <h3 id="class-form-title" class="mb-4 font-heading text-base font-bold text-white">Nueva clase</h3>
              <form id="class-form" class="space-y-4">
                <input type="hidden" name="classId" value="" />
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm text-zinc-400">Título</label>
                    <input name="title" required maxlength="200"
                      class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm text-zinc-400">Semana</label>
                    <input name="week_number" type="number" min="1" value="1" required
                      class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm text-zinc-400">Objetivos</label>
                  <textarea name="objectives" rows="3"
                    class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-zinc-400">Materiales</label>
                    <button type="button" id="btn-add-material" class="text-xs text-[#8B5CF6] hover:text-[#7C3AED]">${Icon('plus', 12)} Agregar material</button>
                  </div>
                  <div id="materials-list" class="space-y-2"></div>
                </div>
                <p id="class-form-error" class="hidden text-sm text-red-400"></p>
                <div class="flex gap-3">
                  <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">Guardar</button>
                  <button type="button" id="btn-cancel-class" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                </div>
              </form>
            </div>
          </div>

          <div id="classes-list" class="space-y-3">
            <p class="text-sm text-zinc-500">Cargando clases...</p>
          </div>
        </div>`

      const pc = document.getElementById('page-content')
      if (pc) pc.innerHTML = html

      document.getElementById('delete-course-btn')?.addEventListener('click', async () => {
        if (!(await confirmDialog('¿Eliminar este curso? Se eliminarán todos los módulos, materiales, evaluaciones y datos asociados.'))) return
        const { error } = await supabase.from('courses').delete().eq('id', id)
        if (error) { toast('error', error.message); return }
        toast('success', 'Curso eliminado')
        router.navigate('/coaches/courses')
      })

      // ── Classes ──
      async function loadClasses() {
        const { data: classes } = await supabase.from('course_classes').select('*').eq('course_id', id).order('week_number', { ascending: true }).order('created_at', { ascending: true })
        const list = document.getElementById('classes-list')
        if (!list) return
        if (!classes || classes.length === 0) {
          list.innerHTML = '<p class="text-sm text-zinc-500">No hay clases en este curso.</p>'
          return
        }
        list.innerHTML = classes.map(c => {
          const mats = typeof c.materials === 'string' ? (() => { try { return JSON.parse(c.materials) } catch { return [] } })() : (c.materials || [])
          const iconMap: Record<string, string> = { pdf: 'fileText', video: 'video', image: 'image', link: 'link', file: 'paperclip' }
          return `<div class="class-card glass rounded-xl p-4" data-id="${escapeHtml(c.id)}" data-title="${escapeHtml(c.title)}" data-week="${c.week_number}" data-objectives="${escapeHtml(c.objectives || '')}" data-materials="${escapeHtml(JSON.stringify(mats))}">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6]">${c.week_number}</span>
                  <h3 class="font-heading text-base font-bold text-white">${escapeHtml(c.title)}</h3>
                </div>
                ${c.objectives ? `<div class="mb-3 text-sm text-zinc-400">${escapeHtml(c.objectives)}</div>` : ''}
                ${mats.length > 0 ? `<div class="flex flex-wrap gap-2">${mats.map((m: any) => `<a href="${escapeHtml(m.url)}" target="_blank" class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition">${Icon(iconMap[m.type] || 'paperclip', 12)} ${escapeHtml(m.name || m.url)}</a>`).join('')}</div>` : ''}
              </div>
              <div class="flex gap-2 shrink-0">
                <button class="edit-class-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">${Icon('edit', 12)}</button>
                <button class="delete-class-btn rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30">${Icon('trash', 12)}</button>
              </div>
            </div>
          </div>`
        }).join('')

        document.querySelectorAll('.edit-class-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const card = (btn as HTMLElement).closest('.class-card') as HTMLElement
            const d = card?.dataset
            if (!d) return
            ;(document.getElementById('class-form')!.querySelector('input[name="classId"]') as HTMLInputElement).value = d.id || ''
            ;(document.getElementById('class-form')!.querySelector('input[name="title"]') as HTMLInputElement).value = d.title || ''
            ;(document.getElementById('class-form')!.querySelector('input[name="week_number"]') as HTMLInputElement).value = d.week || '1'
            ;(document.getElementById('class-form')!.querySelector('textarea[name="objectives"]') as HTMLTextAreaElement).value = d.objectives || ''
            const ml = document.getElementById('materials-list')!
            ml.innerHTML = ''
            try {
              const mats = JSON.parse(d.materials || '[]')
              for (const m of mats) ml.insertAdjacentHTML('beforeend', materialRow(m))
            } catch { ml.innerHTML = materialRow() }
            if (!ml.querySelector('.material-row')) ml.innerHTML = materialRow()
            document.getElementById('class-form-title')!.textContent = 'Editar clase'
            document.getElementById('class-form-area')!.classList.remove('hidden')
            document.getElementById('class-form-area')!.scrollIntoView({ behavior: 'smooth' })
          })
        })
        document.querySelectorAll('.delete-class-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const cid = (btn as HTMLElement).closest('.class-card')?.getAttribute('data-id')
            if (!cid || !(await confirmDialog('¿Eliminar esta clase?'))) return
            const { error } = await supabase.from('course_classes').delete().eq('id', cid)
            if (error) { toast('error', error.message); return }
            toast('success', 'Clase eliminada')
            loadClasses()
          })
        })
      }

      function materialRow(mat?: { type: string; name: string; url: string }): string {
        const idx = Date.now() + Math.random()
        const mt = mat?.type || 'file'
        const mn = mat?.name || ''
        const mu = mat?.url || ''
        return `<div class="material-row flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-idx="${idx}">
          <div class="flex-1 grid gap-2 sm:grid-cols-3">
            <select class="mat-type rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" data-idx="${idx}">
              <option value="pdf" ${mt === 'pdf' ? 'selected' : ''}>PDF</option>
              <option value="video" ${mt === 'video' ? 'selected' : ''}>Video</option>
              <option value="image" ${mt === 'image' ? 'selected' : ''}>Imagen</option>
              <option value="link" ${mt === 'link' ? 'selected' : ''}>Enlace</option>
              <option value="file" ${mt === 'file' ? 'selected' : ''}>Archivo</option>
            </select>
            <input type="text" class="mat-name rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" placeholder="Nombre" value="${escapeHtml(mn)}" data-idx="${idx}" />
            <div class="flex gap-1">
              <input type="text" class="mat-url flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" placeholder="URL" value="${escapeHtml(mu)}" data-idx="${idx}" />
              <button type="button" class="mat-upload text-zinc-500 hover:text-white px-1" title="Subir archivo" data-idx="${idx}">${Icon('upload', 14)}</button>
            </div>
          </div>
          <button type="button" class="mat-remove text-zinc-600 hover:text-red-400 mt-1" data-idx="${idx}">${Icon('x', 14)}</button>
        </div>`
      }

      document.getElementById('materials-list')!.innerHTML = materialRow()

      document.getElementById('materials-list')!.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement
        const btn = target.closest('.mat-remove') as HTMLElement
        if (btn) { btn.closest('.material-row')?.remove(); return }
        const uploadBtn = target.closest('.mat-upload') as HTMLElement
        if (!uploadBtn) return
        const idx = uploadBtn.dataset.idx
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.pdf,.mp4,.png,.jpg,.jpeg,.zip,.ppt,.pptx,.doc,.docx'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) return
          const { url, error } = await uploadFileFromInput('uploads', `classes/${id}`, file.name, file)
          if (error || !url) { toast('error', error || 'Error al subir'); return }
          const urlInput = document.querySelector(`.mat-url[data-idx="${idx}"]`) as HTMLInputElement
          if (urlInput) urlInput.value = url
          toast('success', 'Archivo subido')
        }
        input.click()
      })

      document.getElementById('btn-add-material')!.addEventListener('click', () => {
        document.getElementById('materials-list')!.insertAdjacentHTML('beforeend', materialRow())
      })

      document.getElementById('btn-add-class')!.addEventListener('click', () => {
        const f = document.getElementById('class-form')!
        ;(f.querySelector('input[name="classId"]') as HTMLInputElement).value = ''
        ;(f.querySelector('input[name="title"]') as HTMLInputElement).value = ''
        ;(f.querySelector('input[name="week_number"]') as HTMLInputElement).value = '1'
        ;(f.querySelector('textarea[name="objectives"]') as HTMLTextAreaElement).value = ''
        document.getElementById('materials-list')!.innerHTML = materialRow()
        document.getElementById('class-form-title')!.textContent = 'Nueva clase'
        document.getElementById('class-form-area')!.classList.remove('hidden')
        document.getElementById('class-form-area')!.scrollIntoView({ behavior: 'smooth' })
      })

      document.getElementById('btn-cancel-class')!.addEventListener('click', () => {
        document.getElementById('class-form-area')!.classList.add('hidden')
      })

      document.getElementById('class-form')!.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const cid = fd.get('classId') as string
        const title = fd.get('title') as string
        const weekNumber = parseInt(fd.get('week_number') as string) || 1
        const objectives = (fd.get('objectives') as string) || null
        const materials: { type: string; name: string; url: string }[] = []
        document.querySelectorAll('#materials-list .material-row').forEach(row => {
          const el = row as HTMLElement
          const idx = el.dataset.idx
          if (!idx) return
          const type = (el.querySelector(`.mat-type[data-idx="${idx}"]`) as HTMLSelectElement)?.value || 'file'
          const name = (el.querySelector(`.mat-name[data-idx="${idx}"]`) as HTMLInputElement)?.value?.trim() || ''
          const url = (el.querySelector(`.mat-url[data-idx="${idx}"]`) as HTMLInputElement)?.value?.trim() || ''
          if (name && url) materials.push({ type, name, url })
        })
        if (!title) return
        const payload = { course_id: id, week_number: weekNumber, title, objectives, materials }
        if (cid) {
          const { error } = await supabase.from('course_classes').update(payload).eq('id', cid)
          if (error) { toast('error', error.message); return }
          toast('success', 'Clase actualizada')
        } else {
          const { error } = await supabase.from('course_classes').insert(payload)
          if (error) { toast('error', error.message); return }
          toast('success', 'Clase creada')
        }
        document.getElementById('class-form-area')!.classList.add('hidden')
        loadClasses()
      })

      loadClasses()
    } catch (err) {
      console.error('Error loading course detail:', err)
      const pc = document.getElementById('page-content')
      if (pc) pc.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
    }
  })()
}
