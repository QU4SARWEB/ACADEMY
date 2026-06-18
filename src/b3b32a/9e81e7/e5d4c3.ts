import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { store } from '@/9ed39e/8cd892'

const PRESET_COLORS = ['#8B5CF6','#6D28D9','#EC4899','#EF4444','#F59E0B','#10B981','#3B82F6','#06B6D4','#14B8A6','#F97316']

export function renderSettings(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initSettings(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    const accent = (profile as any)?.role_color || '#8B5CF6'
    const bgUrl = (profile as any)?.custom_bg_url || ''

    const html = `
      <div class="max-w-2xl mx-auto">
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">${Icon('settings', 22)} Personalizar</h1>

        <div class="glass rounded-xl p-6 mb-6">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Color de acento</h2>
          <p class="mb-4 text-sm text-zinc-500">Define el color principal de la plataforma (sidebar, botones, enlaces).</p>
          <div class="flex gap-2 items-center mb-3">
            <input type="color" id="accent-color" value="${accent}" class="h-10 w-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer" />
            <input type="text" id="accent-hex" value="${accent}" maxlength="7" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] font-mono tracking-wider" />
          </div>
          <div class="flex gap-2 flex-wrap">
            ${PRESET_COLORS.map(c => `
              <button class="preset-color w-8 h-8 rounded-full border-2 transition hover:scale-110 ${c === accent ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent'}" style="background:${c}" data-color="${c}" title="${c}"></button>
            `).join('')}
          </div>
          <div class="mt-4 flex items-center gap-4">
            <div class="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs" style="background:${accent}">A</div>
            <div class="flex-1 h-3 rounded-full bg-zinc-800 overflow-hidden">
              <div class="h-full rounded-full transition-all" style="width:60%;background:${accent}"></div>
            </div>
          </div>
        </div>

        <div class="glass rounded-xl p-6 mb-6">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Fondo personalizado</h2>
          <p class="mb-4 text-sm text-zinc-500">Sube una imagen para usarla como fondo de pantalla en la plataforma.</p>
          <div class="relative h-40 rounded-xl overflow-hidden border border-zinc-700 mb-4 bg-zinc-900" id="bg-preview">
            ${bgUrl ? `<img src="${escapeHtml(bgUrl)}" class="h-full w-full object-cover" />` : '<div class="flex h-full items-center justify-center text-zinc-600 text-sm">Sin fondo personalizado</div>'}
          </div>
          <input type="file" id="bg-upload" accept="image/*" class="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B5CF6] file:px-4 file:py-2 file:text-xs file:text-white hover:file:bg-[#7C3AED]" />
          <p class="mt-1 text-xs text-zinc-600">Formatos: JPG, PNG, WebP. Máx 2MB. Recomendado: 1920x1080</p>
          ${bgUrl ? `<button id="remove-bg" class="mt-3 text-xs text-red-400 hover:text-red-300 underline">Eliminar fondo actual</button>` : ''}
        </div>

        <div class="glass rounded-xl p-6 mb-6">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Vista previa</h2>
          <p class="mb-4 text-sm text-zinc-500">Así se verán los principales elementos con tu configuración actual.</p>
          <div class="space-y-3">
            <div class="flex items-center gap-3 rounded-lg px-4 py-3" style="background:${accent}15;border:1px solid ${accent}30">
              <div class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style="background:${accent}">U</div>
              <div>
                <p class="text-sm font-medium text-white" style="color:${accent}">Elemento activo</p>
                <p class="text-xs text-zinc-400">Con el color de acento aplicado</p>
              </div>
              <button class="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-white" style="background:${accent}">Botón</button>
            </div>
            <div class="rounded-lg px-4 py-3 bg-zinc-800/50">
              <p class="text-sm text-zinc-400">Elemento inactivo <span class="px-2 py-0.5 rounded text-xs" style="background:${accent}20;color:${accent}">Badge</span></p>
            </div>
          </div>
        </div>

        <p id="settings-error" class="hidden mb-4 text-sm text-red-400"></p>
        <div class="flex gap-3">
          <button id="save-settings"
            class="btn-glow flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition"
            style="background:${accent};hover:brightness-110">
            ${Icon('settings', 14)} Guardar cambios
          </button>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
    initSettingsEvents(session.user.id)
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar configuración</p>'
  }
}

function initSettingsEvents(userId: string): void {
  // Color presets
  document.querySelectorAll('.preset-color').forEach(b => {
    b.addEventListener('click', () => {
      const c = (b as HTMLElement).dataset.color || '#8B5CF6'
      ;(document.getElementById('accent-color') as HTMLInputElement).value = c
      ;(document.getElementById('accent-hex') as HTMLInputElement).value = c
      document.querySelectorAll('.preset-color').forEach(p => p.classList.remove('border-white', 'scale-110', 'ring-2', 'ring-white/30'))
      b.classList.add('border-white', 'scale-110', 'ring-2', 'ring-white/30')
      updatePreview(c)
    })
  })

  // Hex input
  const hexInput = document.getElementById('accent-hex') as HTMLInputElement
  hexInput?.addEventListener('input', function(this: HTMLInputElement) {
    if (/^#[0-9a-fA-F]{6}$/.test(this.value)) {
      (document.getElementById('accent-color') as HTMLInputElement).value = this.value
      updatePreview(this.value)
    }
  })
  document.getElementById('accent-color')?.addEventListener('input', function(this: HTMLInputElement) {
    hexInput.value = this.value
    updatePreview(this.value)
  })

  // Background preview
  document.getElementById('bg-upload')?.addEventListener('change', function(this: HTMLInputElement) {
    const file = this.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = document.getElementById('bg-preview')!
        preview.innerHTML = `<img src="${e.target?.result}" class="h-full w-full object-cover" />`
      }
      reader.readAsDataURL(file)
    }
  })

  document.getElementById('remove-bg')?.addEventListener('click', async () => {
    await supabase.from('profiles').update({ custom_bg_url: null }).eq('id', userId)
    toast('success', 'Fondo eliminado')
    setTimeout(() => location.reload(), 300)
  })

  // Save
  document.getElementById('save-settings')?.addEventListener('click', async () => {
    const errEl = document.getElementById('settings-error')!
    errEl.classList.add('hidden')
    const color = hexInput?.value?.trim()
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      errEl.textContent = 'Color inválido. Usa formato #RRGGBB (ej: #8B5CF6)'
      errEl.classList.remove('hidden')
      return
    }
    const bgInput = document.getElementById('bg-upload') as HTMLInputElement
    let bgUrl: string | null = null
    if (bgInput?.files?.[0]) {
      bgUrl = await uploadFileFromInput('uploads', userId, 'backgrounds', bgInput.files[0])
      if (!bgUrl) { errEl.textContent = 'Error al subir la imagen'; errEl.classList.remove('hidden'); return }
    }
    const update: any = { role_color: color }
    if (bgUrl) update.custom_bg_url = bgUrl
    const { error } = await supabase.from('profiles').update(update).eq('id', userId)
    if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return }
    toast('success', 'Preferencias guardadas — recargando...')
    setTimeout(() => location.reload(), 500)
  })
}

function updatePreview(color: string): void {
  document.querySelectorAll('[style*="accent"]').forEach(el => {
    const h = el as HTMLElement
    if (h.style.background?.includes('15)')) h.style.background = `${color}15`
    if (h.style.border?.includes('30)')) h.style.border = `1px solid ${color}30`
    if (h.style.color && h.dataset.original) h.style.color = color
  })
  // Update the accent demo elements
  document.querySelectorAll('.preset-color').forEach(p => {
    const c = (p as HTMLElement).dataset.color
    if (c === color) p.classList.add('border-white', 'scale-110', 'ring-2', 'ring-white/30')
    else p.classList.remove('border-white', 'scale-110', 'ring-2', 'ring-white/30')
  })
}
