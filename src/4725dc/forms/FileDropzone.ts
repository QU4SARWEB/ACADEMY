import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'

export interface FileDropzoneConfig {
  name: string
  label: string
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  preview?: boolean
}

export function renderFileDropzone(config: FileDropzoneConfig): string {
  return `
    <div class="file-dropzone" data-name="${escapeHtml(config.name)}" data-max-mb="${config.maxSizeMB ?? 50}">
      <label class="mb-1 block text-xs font-medium text-zinc-400">${escapeHtml(config.label)}</label>
      <div class="drop-zone relative rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center transition hover:border-[#8B5CF6]/50 cursor-pointer" data-name="${escapeHtml(config.name)}">
        <div class="flex flex-col items-center gap-2">
          ${Icon('upload', 24)}
          <p class="text-sm text-zinc-400">Arrastra archivos aquí o <span class="text-[#8B5CF6]">selecciona</span></p>
          <p class="text-xs text-zinc-600">${config.accept ? 'Formatos: ' + config.accept : 'Todos los formatos'} · ${config.multiple ? 'Varios archivos' : '1 archivo'} · Máx ${config.maxSizeMB ?? 50}MB</p>
        </div>
        <input type="file" name="${escapeHtml(config.name)}" ${config.multiple ? 'multiple' : ''}
          accept="${escapeHtml(config.accept || '*')}"
          class="absolute inset-0 cursor-pointer opacity-0" />
      </div>
      <div class="file-preview mt-2 flex flex-wrap gap-2 ${config.preview ? '' : 'hidden'}"></div>
      <p class="file-error mt-1 hidden text-xs text-red-400"></p>
    </div>`
}

export function initFileDropzone(container: HTMLElement): void {
  container.querySelectorAll('.drop-zone').forEach((zone) => {
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    if (!input) return

    zone.addEventListener('dragover', (e: Event) => {
      e.preventDefault()
      zone.classList.add('border-[#8B5CF6]', 'bg-zinc-800/50')
    })

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('border-[#8B5CF6]', 'bg-zinc-800/50')
    })

    zone.addEventListener('drop', (e: Event) => {
      e.preventDefault()
      zone.classList.remove('border-[#8B5CF6]', 'bg-zinc-800/50')
      const dt = (e as DragEvent).dataTransfer
      if (dt?.files) {
        input.files = dt.files
        input.dispatchEvent(new Event('change'))
      }
    })

    input.addEventListener('change', () => {
      const parent = zone.closest('.file-dropzone') as HTMLElement
      const preview = parent?.querySelector('.file-preview') as HTMLElement
      const error = parent?.querySelector('.file-error') as HTMLElement
      if (!parent || !preview) return

      error?.classList.add('hidden')
      const files = input.files
      if (!files || files.length === 0) {
        preview.innerHTML = ''
        return
      }

      const maxMB = parseInt(parent.dataset.maxMb || '50')
      let totalSize = 0
      for (const f of Array.from(files)) totalSize += f.size
      if (totalSize > maxMB * 1024 * 1024) {
        if (error) {
          error.textContent = `Los archivos exceden el límite de ${maxMB}MB`
          error.classList.remove('hidden')
        }
        input.value = ''
        preview.innerHTML = ''
        return
      }

      preview.innerHTML = Array.from(files).map((f) => {
        const isImage = f.type.startsWith('image/')
        const sizeKB = Math.round(f.size / 1024)
        return `
          <div class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
            ${isImage ? Icon('image', 12) : Icon('paperclip', 12)}
            <span>${escapeHtml(f.name)} (${sizeKB}KB)</span>
          </div>`
      }).join('')
    })
  })
}

export function getFileDropzoneFiles(name: string): FileList | null {
  const input = document.querySelector<HTMLInputElement>(`.drop-zone input[name="${name}"]`)
  return input?.files ?? null
}

export function resetFileDropzone(name: string): void {
  const input = document.querySelector<HTMLInputElement>(`.drop-zone input[name="${name}"]`)
  if (input) {
    input.value = ''
    const preview = input.closest('.file-dropzone')?.querySelector('.file-preview')
    if (preview) preview.innerHTML = ''
  }
}
