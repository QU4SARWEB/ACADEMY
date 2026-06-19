import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { uploadFile, getFilePath } from '@/2b3583/76ee3d'

const typeBadgeColors: Record<string, string> = {
  video: 'bg-blue-500/20 text-blue-400',
  pdf: 'bg-red-500/20 text-red-400',
  doc: 'bg-yellow-500/20 text-yellow-400',
  link: 'bg-purple-500/20 text-purple-400',
  other: 'bg-zinc-500/20 text-zinc-400',
}

const typeIcons: Record<string, string> = {
  video: Icon('play', 16),
  pdf: Icon('scrollText', 16),
  doc: Icon('scrollText', 16),
  link: Icon('externalLink', 16),
  other: Icon('scrollText', 16),
}

export function renderCoachModuleDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachModuleDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const courseId = params.id
    const moduleId = params.mid
    if (!courseId || !moduleId) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Parámetros inválidos.</p>'
      return
    }

    const { data: mod, error: modErr } = await supabase
      .from('course_modules')
      .select('*, courses(name)')
      .eq('id', moduleId)
      .maybeSingle()

    if (modErr || !mod) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Módulo no encontrado.</p>'
      return
    }

    const { data: materials } = await supabase
      .from('materials')
      .select('*')
      .eq('module_id', moduleId)
      .order('display_order')

    const courseName = (mod as any).courses?.name ?? ''
    const matList = materials ?? []

    const html = `
      <div>
        <div class="mb-4 flex items-center gap-2 text-sm text-zinc-400">
          <a href="#/coaches/courses" class="hover:text-white">Cursos</a>
          <span>/</span>
          <a href="#/coaches/courses/${escapeHtml(courseId)}" class="hover:text-white">${escapeHtml(courseName)}</a>
          <span>/</span>
          <span class="text-zinc-300">${escapeHtml((mod as any).name)}</span>
        </div>

        <div id="module-view" class="mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((mod as any).name)}</h1>
              <p class="mt-1 text-sm text-zinc-400">
                Mes ${(mod as any).month_number} · Orden ${(mod as any).display_order}
                ${(mod as any).description ? ` · ${escBr((mod as any).description)}` : ''}
              </p>
            </div>
            <div class="flex gap-2">
              <button id="edit-module-btn" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800">
                ${Icon('edit', 14)} Editar
              </button>
              <button id="delete-module-btn" class="rounded-lg border border-red-700 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-900/30">
                ${Icon('trash', 14)}
              </button>
            </div>
          </div>
        </div>

        <div id="module-edit" class="mb-6 hidden">
          <form id="edit-module-form">
            <div class="rounded-lg border border-zinc-800 bg-[#111] p-4">
              <h2 class="mb-4 font-heading text-lg font-bold text-white">Editar módulo</h2>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs text-zinc-500">Nombre</label>
                  <input name="name" value="${escapeHtml((mod as any).name)}" required
                    class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label class="block text-xs text-zinc-500">Descripción</label>
                  <input name="description" value="${escBr((mod as any).description || '')}"
                    class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div class="flex gap-4">
                  <div class="flex-1">
                    <label class="block text-xs text-zinc-500">Mes</label>
                    <input name="month_number" type="number" value="${(mod as any).month_number}" required
                      class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  </div>
                  <div class="flex-1">
                    <label class="block text-xs text-zinc-500">Orden</label>
                    <input name="display_order" type="number" value="${(mod as any).display_order}" required
                      class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  </div>
                </div>
              </div>
              <div class="mt-4 flex gap-2">
                <button type="submit"
                  class="rounded bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Guardar</button>
                <button type="button" id="cancel-edit-module"
                  class="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</button>
              </div>
            </div>
          </form>
        </div>

        <div class="mb-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-heading text-lg font-bold text-white">Materiales</h2>
          </div>
          <div id="materials-list" class="space-y-2">
            ${matList.length === 0
              ? '<p class="text-sm text-zinc-500">Sin materiales todavía.</p>'
              : matList.map((m: any) => {
                  const isVideoOrLink = m.url && (m.type === 'video' || m.type === 'link')
                  const icon = typeIcons[m.type] ?? typeIcons.other
                  const badge = typeBadgeColors[m.type] ?? typeBadgeColors.other
                  return `
                    <div class="material-item rounded-lg border border-zinc-800 bg-[#111] transition hover:border-zinc-700" data-id="${escapeHtml(m.id)}">
                      <div class="material-view flex items-center gap-3 px-4 py-3">
                        ${isVideoOrLink
                          ? `<a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="flex min-w-0 flex-1 items-center gap-3">`
                          : `<div class="flex min-w-0 flex-1 items-center gap-3">`
                        }
                          ${icon}
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium text-white">${escapeHtml(m.title)}</p>
                            <div class="flex items-center gap-2">
                              <span class="rounded px-1.5 py-0.5 text-xs font-medium ${badge}">${escapeHtml(m.type)}</span>
                              ${m.description ? `<span class="text-xs text-zinc-500">${escBr(m.description)}</span>` : ''}
                              <span class="text-xs text-zinc-600">Ord. ${m.display_order}</span>
                            </div>
                          </div>
                        ${isVideoOrLink ? '</a>' : '</div>'}
                        <div class="flex items-center gap-1 shrink-0">
                          <button class="edit-mat-btn rounded p-1 text-zinc-500 hover:text-white hover:bg-zinc-800" data-id="${escapeHtml(m.id)}">
                            ${Icon('edit', 14)}
                          </button>
                          <button class="delete-mat-btn rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800" data-id="${escapeHtml(m.id)}">
                            ${Icon('trash', 14)}
                          </button>
                        </div>
                      </div>
                      <div class="material-edit hidden border-t border-zinc-800 p-4">
                        <form class="edit-material-form">
                          <input type="hidden" name="id" value="${escapeHtml(m.id)}" />
                          <div class="space-y-3">
                            <div>
                              <label class="block text-xs text-zinc-500">Título</label>
                              <input name="title" value="${escapeHtml(m.title)}" required
                                class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                            </div>
                            <div class="flex gap-4">
                              <div class="flex-1">
                                <label class="block text-xs text-zinc-500">Tipo</label>
                                <select name="type"
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                                  <option value="video" ${m.type === 'video' ? 'selected' : ''}>Video</option>
                                  <option value="pdf" ${m.type === 'pdf' ? 'selected' : ''}>PDF</option>
                                  <option value="doc" ${m.type === 'doc' ? 'selected' : ''}>Documento</option>
                                  <option value="link" ${m.type === 'link' ? 'selected' : ''}>Enlace</option>
                                  <option value="other" ${m.type === 'other' ? 'selected' : ''}>Otro</option>
                                </select>
                              </div>
                              <div class="flex-[2]">
                                <label class="block text-xs text-zinc-500">URL o archivo</label>
                                <input name="url" value="${escapeHtml(m.url || '')}" placeholder="Pega una URL..."
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                                <input name="file" type="file"
                                  class="mt-2 w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-white hover:file:bg-zinc-700" />
                              </div>
                              <div class="w-24">
                                <label class="block text-xs text-zinc-500">Orden</label>
                                <input name="display_order" type="number" value="${m.display_order}" required
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                              </div>
                            </div>
                            <div>
                              <label class="block text-xs text-zinc-500">Descripción</label>
                              <textarea name="description" rows="2"
                                class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escBr(m.description || '')}</textarea>
                            </div>
                          </div>
                          <div class="mt-3 flex gap-2">
                            <button type="submit"
                              class="rounded bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">Guardar</button>
                            <button type="button" class="cancel-edit-mat rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">Cancelar</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  `
                }).join('')
            }
          </div>
        </div>

        <div class="rounded-lg border border-zinc-800 bg-[#111] p-4">
          <h3 class="mb-4 font-heading text-base font-bold text-white">${Icon('plus', 14)} Añadir material</h3>
          <form id="add-material-form">
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-zinc-500">Título</label>
                <input name="title" required
                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div class="flex gap-4">
                <div class="flex-1">
                  <label class="block text-xs text-zinc-500">Tipo</label>
                  <select name="type"
                    class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Documento</option>
                    <option value="link">Enlace</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div class="flex-[2]">
                  <label class="block text-xs text-zinc-500">URL o archivo</label>
                  <input name="url" placeholder="Pega una URL..."
                    class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  <input name="file" type="file"
                    class="mt-2 w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-white hover:file:bg-zinc-700" />
                </div>
                <div class="w-24">
                  <label class="block text-xs text-zinc-500">Orden</label>
                  <input name="display_order" type="number" value="${matList.length + 1}" required
                    class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
              </div>
              <div>
                <label class="block text-xs text-zinc-500">Descripción</label>
                <textarea name="description" rows="2"
                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
              </div>
            </div>
            <button type="submit"
              class="mt-4 rounded bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Añadir</button>
          </form>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('edit-module-btn')?.addEventListener('click', () => {
      document.getElementById('module-view')!.classList.add('hidden')
      document.getElementById('module-edit')!.classList.remove('hidden')
    })

    document.getElementById('cancel-edit-module')?.addEventListener('click', () => {
      document.getElementById('module-view')!.classList.remove('hidden')
      document.getElementById('module-edit')!.classList.add('hidden')
    })

    document.getElementById('edit-module-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const { error } = await supabase
        .from('course_modules')
        .update({
          name: fd.get('name') as string,
          description: (fd.get('description') as string) || null,
          month_number: parseInt(fd.get('month_number') as string),
          display_order: parseInt(fd.get('display_order') as string),
        })
        .eq('id', moduleId)
      if (error) {
        toast('error', error.message)
      } else {
        toast('success', 'Módulo actualizado')
        initCoachModuleDetail()
      }
    })

    document.getElementById('delete-module-btn')?.addEventListener('click', async () => {
      if (!(await confirmDialog('¿Eliminar este módulo? Se eliminarán todos los materiales asociados.'))) return
      const { error } = await supabase.from('course_modules').delete().eq('id', moduleId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Módulo eliminado')
      router.navigate(`/coaches/courses/${escapeHtml(courseId)}`)
    })

    document.getElementById('add-material-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const file = fd.get('file') as File | null
      let url = (fd.get('url') as string) || null

      if (file && file.size > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id || 'coach'
        const { url: uploadedUrl, error: uploadErr } = await uploadFile('uploads', getFilePath(userId, 'materials', file.name), file)
        if (uploadErr) { toast('error', uploadErr); return }
        url = uploadedUrl ?? null
      }

      const { error } = await supabase
        .from('materials')
        .insert({
          module_id: moduleId,
          title: fd.get('title') as string,
          type: fd.get('type') as string,
          url,
          description: (fd.get('description') as string) || null,
          display_order: parseInt(fd.get('display_order') as string),
        })
      if (error) {
        toast('error', error.message)
      } else {
        toast('success', 'Material añadido')
        initCoachModuleDetail()
      }
    })

    document.querySelectorAll('.edit-mat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).getAttribute('data-id')
        const item = document.querySelector(`.material-item[data-id="${id}"]`)
        if (!item) return
        item.querySelector('.material-view')?.classList.add('hidden')
        item.querySelector('.material-edit')?.classList.remove('hidden')
      })
    })

    document.querySelectorAll('.cancel-edit-mat').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = (btn as HTMLElement).closest('.material-item')
        if (!item) return
        item.querySelector('.material-view')?.classList.remove('hidden')
        item.querySelector('.material-edit')?.classList.add('hidden')
      })
    })

    document.querySelectorAll('.edit-material-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const id = fd.get('id') as string
        const file = fd.get('file') as File | null
        let url = (fd.get('url') as string) || null

        if (file && file.size > 0) {
          const { data: { session } } = await supabase.auth.getSession()
          const userId = session?.user?.id || 'coach'
          const { url: uploadedUrl, error: uploadErr } = await uploadFile('uploads', getFilePath(userId, 'materials', file.name), file)
          if (uploadErr) { toast('error', uploadErr); return }
          url = uploadedUrl ?? null
        }

        const { error } = await supabase
          .from('materials')
          .update({
            title: fd.get('title') as string,
            type: fd.get('type') as string,
            url,
            description: (fd.get('description') as string) || null,
            display_order: parseInt(fd.get('display_order') as string),
          })
          .eq('id', id)
        if (error) {
          toast('error', error.message)
        } else {
          toast('success', 'Material actualizado')
          initCoachModuleDetail()
        }
      })
    })

    document.querySelectorAll('.delete-mat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).getAttribute('data-id')
        if (!id) return
        if (!(await confirmDialog('¿Eliminar este material?'))) return
        const { error } = await supabase
          .from('materials')
          .delete()
          .eq('id', id)
        if (error) {
          toast('error', error.message)
        } else {
          toast('success', 'Material eliminado')
          initCoachModuleDetail()
        }
      })
    })

  } catch (err) {
    console.error('Error loading module detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el módulo</p>'
  }
}
