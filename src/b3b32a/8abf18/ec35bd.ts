import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'
import { uploadFile, uploadModuleCover } from '@/2b3583/76ee3d'
import { rankBadge } from '@/2b3583/ranks'

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
      sessionStorage.setItem(`qu4sar-course-context:${id}`, (course as any).name)

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, profiles(full_name, display_name)')
        .eq('course_id', id)
        .eq('status', 'active')

const { data: modules } = await supabase
        .from('course_modules')
        .select('id, title, description, display_order, is_published, cover_url')
        .eq('course_id', id)
        .order('display_order')
      const moduleIds = (modules ?? []).map((module: any) => module.id)
      const { data: materials } = moduleIds.length > 0
        ? await supabase.from('course_materials').select('id, module_id, title, description, material_type, resource_url, display_order, is_published').in('module_id', moduleIds).order('display_order')
        : { data: [] as any[] }
      const materialsByModule = new Map<string, any[]>()
      for (const material of materials ?? []) {
        const rows = materialsByModule.get(material.module_id) || []
        rows.push(material)
        materialsByModule.set(material.module_id, rows)
      }

const html = `
        ${Breadcrumb([
          { label: 'Cursos', href: '#/coaches/courses' },
          { label: (course as any).name || 'Detalle' },
        ])}
${(course as any).cover_url ? `<img src="${escapeHtml((course as any).cover_url)}" alt="" class="course-detail-page__cover mb-4" loading="lazy" decoding="async" />` : ''}
        <div class="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((course as any).name)}</h1>
              <p class="mt-1 text-sm text-zinc-500">
                ${(course as any).duration_months} meses · Rango mínimo: ${rankBadge((course as any).min_rank, 18)} ${escapeHtml((course as any).min_rank)}${(course as any).price && (course as any).price > 0 ? ` · $${(course as any).price}/mes` : ' · Gratis'}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/coaches/courses/${escapeHtml(id)}/edit"
                class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">${Icon('edit', 14)} Editar</a>
              <button id="delete-course-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)}</button>
            </div>
        </div>

        ${(course as any).description ? `<div class="glass mb-6 rounded-xl p-4 text-sm text-zinc-300">${escBr((course as any).description)}</div>` : ''}

        <section class="card coach-content-manager mb-8">
          <div class="course-detail-panel__head">
            <div><span class="kicker">Constructor de curso</span><h2>Contenido y materiales</h2></div>
            <span class="course-content-count">${modules?.length || 0} módulos</span>
          </div>
          <form id="new-module-form" class="coach-content-create-form">
            <input name="title" required placeholder="Nombre del nuevo módulo" />
            <input name="description" placeholder="Descripción breve (opcional)" />
            <button type="submit" class="btn btn-primary">${Icon('plus', 14)} Crear módulo</button>
          </form>
          <div class="coach-module-list">
            ${(modules ?? []).length === 0 ? '<p class="course-detail-empty">Aún no hay módulos. Crea el primero para comenzar la ruta.</p>' : (modules ?? []).map((module: any, index: number) => `
              <article class="coach-module-editor" data-module-id="${escapeHtml(module.id)}">
                <div class="coach-module-editor__head">
                  <div class="coach-module-editor__title">
                    ${module.cover_url
                      ? `<img src="${escapeHtml(module.cover_url)}" alt="" class="coach-module-thumb" loading="lazy" decoding="async" />`
                      : `<span class="course-module__number">${String(index + 1).padStart(2, '0')}</span>`}
                    <div><h3>${escapeHtml(module.title)}</h3><p>${escapeHtml(module.description || 'Sin descripción')}</p></div>
                  </div>
                  <div class="coach-module-editor__actions">
                    <label class="coach-module-cover-btn" title="${module.cover_url ? 'Cambiar imagen' : 'Subir imagen'}">
                      <input type="file" name="module_cover" accept="image/*" hidden class="module-cover-input" data-module-id="${escapeHtml(module.id)}" />
                      ${Icon('image', 13)} ${module.cover_url ? 'Cambiar' : 'Imagen'}
                    </label>
                    <span class="course-publish-status ${module.is_published ? 'published' : ''}">${module.is_published ? 'Publicado' : 'Borrador'}</span>
                    <button type="button" class="delete-module-btn" data-module-id="${escapeHtml(module.id)}" aria-label="Eliminar módulo">${Icon('trash', 14)}</button>
                  </div>
                </div>
                <div class="coach-material-list">
${(materialsByModule.get(module.id) || []).map((material: any) => `
<div class="coach-material-row ${material.is_published ? '' : 'draft'}">
                      ${material.material_type === 'image' && material.resource_url
                        ? `<img src="${escapeHtml(material.resource_url)}" alt="${escapeHtml(material.title)}" class="coach-material-thumb" loading="lazy" decoding="async" />`
                        : `<span class="course-material__icon">${Icon(material.material_type === 'video' ? 'video' : material.material_type === 'document' ? 'fileText' : material.material_type === 'link' ? 'externalLink' : material.material_type === 'image' ? 'image' : 'bookOpen', 15)}</span>`}
                      <span class="min-w-0 flex-1"><strong>${escapeHtml(material.title)}</strong><small>${escapeHtml(material.description || material.resource_url.split('?')[0].split('/').pop()?.replace(/^\d{13}-/, '') || material.material_type)}</small></span>
                      ${material.resource_url ? `<a href="${escapeHtml(material.resource_url)}" target="_blank" rel="noopener" class="text-zinc-500 transition hover:text-[#8B5CF6]" title="Abrir recurso">${Icon('externalLink', 13)}</a>` : ''}
                      <button type="button" class="delete-material-btn" data-material-id="${escapeHtml(material.id)}" aria-label="Eliminar material">${Icon('trash', 13)}</button>
</div>`).join('') || '<p class="course-detail-empty">Sin materiales todavía.</p>'}
                </div>
                <form class="coach-material-form" data-module-id="${escapeHtml(module.id)}">
                  <input name="title" required placeholder="Nuevo material" />
                  <select name="material_type"><option value="video">Video</option><option value="document">Documento</option><option value="image">Imagen</option><option value="link">Enlace</option><option value="text">Texto</option></select>
                  <input name="resource_url" placeholder="URL del recurso (opcional)" data-toggle-field />
                  <label class="coach-material-file" title="Subir archivo">
                    <input type="file" name="material_file" accept="application/pdf,image/*,video/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" hidden />
                    <span>${Icon('paperclip', 15)} Archivo</span>
                  </label>
                  <button type="submit" aria-label="Agregar material">${Icon('plus', 15)}</button>
                </form>
              </article>`).join('')}
          </div>
        </section>

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

        `
      const pc = document.getElementById('page-content')
      if (pc) pc.innerHTML = html

      document.getElementById('new-module-form')?.addEventListener('submit', async (event) => {
        event.preventDefault()
        const form = event.currentTarget as HTMLFormElement
        const formData = new FormData(form)
        const { error } = await supabase.from('course_modules').insert({
          course_id: id,
          title: String(formData.get('title') || '').trim(),
          description: String(formData.get('description') || '').trim() || null,
          display_order: (modules?.length || 0) + 1,
          is_published: true,
        })
        if (error) { toast('error', error.message); return }
        toast('success', 'Módulo creado')
        mountCoachCourseDetail()
      })

document.querySelectorAll<HTMLFormElement>('.coach-material-form').forEach(form => {
        form.addEventListener('submit', async (event) => {
          event.preventDefault()
          const moduleId = form.dataset.moduleId
          if (!moduleId) return
          const formData = new FormData(form)
          const title = String(formData.get('title') || '').trim()
          if (!title) { toast('error', 'Escribe un título para el material'); return }
          const file = (form.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0]
          let resourceUrl: string | null = null
          let materialType = String(formData.get('material_type') || 'link')
          const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement
          if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>' }
          try {
            if (file) {
              const ext = (file.name.split('.').pop() || '').toLowerCase()
              const isVideo = file.type.startsWith('video/')
              const isImage = file.type.startsWith('image/')
              const isPdf = file.type === 'application/pdf' || ext === 'pdf'
              materialType = isVideo ? 'video' : (isImage ? 'image' : (isPdf || ext === 'zip' || ext === 'doc' || ext === 'docx' || ext === 'ppt' || ext === 'pptx' || ext === 'xls' || ext === 'xlsx') ? 'document' : materialType)
              const path = `courses/${encodeURIComponent(id)}/materials/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`
              const { url, error: upErr } = await uploadFile('attachments', path, file)
              if (upErr) { toast('error', upErr); return }
              resourceUrl = url || null
            } else {
              const manualUrl = String(formData.get('resource_url') || '').trim()
              if (manualUrl) resourceUrl = manualUrl
            }
            const { error } = await supabase.from('course_materials').insert({
              module_id: moduleId,
              title,
              material_type: materialType,
              resource_url: resourceUrl,
              description: file ? (String(formData.get('resource_url') || '').trim() || null) : null,
              display_order: (materialsByModule.get(moduleId)?.length || 0) + 1,
              is_published: true,
            })
            if (error) { toast('error', error.message); return }
            toast('success', file ? 'Archivo subido y agregado' : 'Material agregado')
            mountCoachCourseDetail()
          } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = Icon('plus', 15) }
          }
        })
      })

      document.querySelectorAll<HTMLElement>('.delete-module-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const moduleId = button.dataset.moduleId
          if (!moduleId || !(await confirmDialog('¿Eliminar este módulo y sus materiales?'))) return
          const { error } = await supabase.from('course_modules').delete().eq('id', moduleId)
          if (error) { toast('error', error.message); return }
          toast('success', 'Módulo eliminado')
          mountCoachCourseDetail()
        })
      })

      document.querySelectorAll<HTMLInputElement>('.module-cover-input').forEach(input => {
        input.addEventListener('change', async () => {
          const moduleId = input.dataset.moduleId
          const file = input.files?.[0]
          if (!moduleId || !file) return
          const { url, error } = await uploadModuleCover(id, moduleId, file)
          if (error || !url) { toast('error', 'No se pudo subir la portada'); return }
          const { error: upErr } = await supabase.from('course_modules').update({ cover_url: url }).eq('id', moduleId)
          if (upErr) { toast('error', upErr.message); return }
          toast('success', 'Portada actualizada')
          mountCoachCourseDetail()
        })
      })

      document.querySelectorAll<HTMLElement>('.delete-material-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const materialId = button.dataset.materialId
          if (!materialId || !(await confirmDialog('¿Eliminar este material?'))) return
          const { error } = await supabase.from('course_materials').delete().eq('id', materialId)
          if (error) { toast('error', error.message); return }
          toast('success', 'Material eliminado')
          mountCoachCourseDetail()
        })
      })

      document.getElementById('delete-course-btn')?.addEventListener('click', async () => {
        if (!(await confirmDialog('¿Eliminar este curso? Se eliminarán todos los módulos, materiales, evaluaciones y datos asociados.'))) return
        const { error } = await supabase.from('courses').delete().eq('id', id)
        if (error) { toast('error', error.message); return }
        toast('success', 'Curso eliminado')
        router.navigate('/coaches/courses')
      })


    } catch (err) {
      console.error('Error loading course detail:', err)
      const pc = document.getElementById('page-content')
      if (pc) pc.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
    }
  })()
}
