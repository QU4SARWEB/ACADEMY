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
  /** Abre la cámara del dispositivo directamente ('user' selfie | 'environment' trasera). */
  capture?: 'user' | 'environment' | boolean
  /** Muestra un botón extra "Usar cámara" además de galería/archivos. */
  showCameraButton?: boolean
}

export function renderFileDropzone(config: FileDropzoneConfig): string {
  const captureAttr = config.capture
    ? ` capture="${config.capture === true ? '' : config.capture}"`
    : ''
  const cameraBtn = config.showCameraButton
    ? `<button type="button" class="file-dropzone__camera flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white" data-camera-btn>
        ${Icon('camera', 14)} Tomar foto
      </button>`
    : ''
  return `
    <div class="file-dropzone" data-name="${escapeHtml(config.name)}" data-max-mb="${config.maxSizeMB ?? 50}">
      <label class="mb-1 block text-xs font-medium text-zinc-400">${escapeHtml(config.label)}</label>
      <div class="drop-zone relative rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center transition hover:border-[#8B5CF6]/50 cursor-pointer" data-name="${escapeHtml(config.name)}">
        <div class="flex flex-col items-center gap-2">
          ${Icon('upload', 24)}
          <p class="text-sm text-zinc-400">Arrastra o toca para <span class="text-[#8B5CF6]">elegir</span></p>
          <p class="text-xs text-zinc-600">${config.accept ? 'Formatos: ' + config.accept : 'Todos los formatos'} · ${config.multiple ? 'Varios archivos' : '1 archivo'} · Máx ${config.maxSizeMB ?? 50}MB</p>
        </div>
        <input type="file" name="${escapeHtml(config.name)}" ${config.multiple ? 'multiple' : ''}
          accept="${escapeHtml(config.accept || '*')}"${captureAttr}
          class="absolute inset-0 cursor-pointer opacity-0" />
      </div>
      ${cameraBtn ? `<div class="mt-2 flex items-center gap-2">${cameraBtn}<span class="text-[10px] text-zinc-600">En el celular abre la cámara</span></div>` : ''}
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
      if (dt?.files && dt.files.length > 0) {
        input.files = dt.files
        input.dispatchEvent(new Event('change'))
      }
    })

    // Botón "tomar foto": dispara un input file con capture
    const dzParent = zone.closest('.file-dropzone') as HTMLElement
    const cameraBtn = dzParent?.querySelector('.file-dropzone__camera')
    cameraBtn?.addEventListener('click', (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      const photoInput = document.createElement('input')
      photoInput.type = 'file'
      photoInput.accept = 'image/*'
      photoInput.setAttribute('capture', 'environment')
      photoInput.classList.add('hidden')
      photoInput.addEventListener('change', () => {
        if (photoInput.files && photoInput.files.length > 0) {
          input.files = photoInput.files
          input.dispatchEvent(new Event('change'))
        }
      })
      photoInput.click()
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

      const items = Array.from(files).map((f) => {
        const isImage = f.type.startsWith('image/')
        const sizeKB = Math.round(f.size / 1024)
        const thumb = isImage
          ? `<img src="${URL.createObjectURL(f)}" alt="" class="h-10 w-10 shrink-0 rounded-lg object-cover" decoding="async" />`
          : `<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">${Icon(isImage ? 'image' : 'paperclip', 16)}</span>`
        return `
          <div class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
            ${thumb}
            <span class="max-w-[180px] truncate">${escapeHtml(f.name)}</span>
            <span class="text-zinc-600">${sizeKB}KB</span>
          </div>`
      })

      preview.innerHTML = items.join('')

      // Limpiar Object URLs cuando se re-renderice
      const previousUrls: string[] = (preview as any).__urls || []
      previousUrls.forEach((u: string) => URL.revokeObjectURL(u))
      const urls = preview.querySelectorAll<HTMLImageElement>('img')
      ;(preview as any).__urls = Array.from(urls).map((img) => img.src)
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
    if (preview) {
      const urls = (preview as any).__urls || []
      urls.forEach((u: string) => URL.revokeObjectURL(u))
      ;(preview as any).__urls = []
      preview.innerHTML = ''
    }
  }
}

export function showFileDropzoneError(name: string, message: string): void {
  const parent = document.querySelector<HTMLElement>(`.file-dropzone[data-name="${name}"]`)
  const error = parent?.querySelector('.file-error') as HTMLElement
  if (error) {
    error.textContent = message
    error.classList.remove('hidden')
  } else {
    toast('error', message)
  }
}

export function clearFileDropzoneError(name: string): void {
  const parent = document.querySelector<HTMLElement>(`.file-dropzone[data-name="${name}"]`)
  const error = parent?.querySelector('.file-error') as HTMLElement
  if (error) error.classList.add('hidden')
}