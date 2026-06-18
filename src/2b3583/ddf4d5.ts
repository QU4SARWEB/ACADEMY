import { escapeHtml, escBr } from '@/2b3583/e0ebc3'

const RANKS = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']
const IN_GAME_ROLES = ['Duelist', 'Controller', 'Initiator', 'Sentinel', 'Flex']

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'perfil'
}

export function renderProfileForm(profile: any, pubProfile?: any): string {
  const pubEnabled = pubProfile?.is_public ?? false
  const pubSlug = pubProfile?.slug ?? slugify(profile.display_name ?? profile.full_name ?? '')
  const publicUrl = pubSlug ? `${window.location.origin}${window.location.pathname}#/p/${pubSlug}` : ''
  return `
    <div class="space-y-6">
      <div class="flex items-center gap-4">
        <div class="group relative">
          <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-3xl font-bold text-[#8B5CF6]">
            ${profile.avatar_url
              ? `<img id="avatar-img" src="${profile.avatar_url}" alt="" class="h-full w-full object-cover" />`
            : (profile.full_name?.charAt(0)?.toUpperCase() ?? '?')
            }
          </div>
          <label class="absolute inset-0 flex cursor-pointer items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition group-hover:opacity-70">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span class="text-[10px] text-white">Subir</span>
            <input type="file" id="avatar-upload" accept="image/*,image/gif" class="hidden" />
          </label>
        </div>
        <div>
          <h2 class="text-xl font-bold text-white">${escapeHtml(profile.full_name)}</h2>
          <p class="text-sm text-zinc-400">${escapeHtml(profile.email)}</p>
          <p id="avatar-upload-status" class="hidden text-xs text-purple-400">Subiendo imagen...</p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-zinc-400">Nombre completo</label>
          <input name="fullName" value="${escapeHtml(profile.full_name ?? '')}"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Nombre de display</label>
          <input name="displayName" value="${escapeHtml(profile.display_name ?? '')}" placeholder="Apodo público"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Riot ID</label>
          <input name="riotId" value="${escapeHtml(profile.riot_id ?? '')}" placeholder="Jugador#1234"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Color de rol</label>
          <input name="roleColor" type="color" value="${escapeHtml(profile.role_color ?? '#8B5CF6')}"
            class="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-700 bg-[#0A0A0A] p-1 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Rango Valorant</label>
          <select name="rank"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar...</option>
            ${RANKS.map(r => `<option value="${r}" ${profile.rank === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-zinc-400">Biografía</label>
          <textarea name="bio" rows="3"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]">${escBr(profile.bio ?? '')}</textarea>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-zinc-400 mb-1">Banner / Portada</label>
        <div class="relative h-32 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900" id="banner-preview">
          ${profile.banner_url
            ? `<img id="banner-img" src="${profile.banner_url}" alt="" class="h-full w-full object-cover" />`
            : '<div class="flex h-full items-center justify-center text-zinc-600"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>'
          }
          <label class="absolute inset-0 flex cursor-pointer items-center justify-center gap-2 bg-black/60 opacity-0 transition hover:opacity-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span class="text-xs text-white">Subir banner</span>
            <input type="file" id="banner-upload" accept="image/*,image/gif" class="hidden" />
          </label>
        </div>
        <p id="banner-upload-status" class="mt-1 hidden text-xs text-purple-400">Subiendo banner...</p>
        <p class="mt-1 text-xs text-zinc-500">Haz clic en la imagen para subir un banner. Formatos: JPG, PNG, WebP, GIF</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-zinc-400">País</label>
          <input name="country" value="${escapeHtml(profile.country ?? '')}" placeholder="Ej: Perú"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Región</label>
          <input name="region" value="${escapeHtml(profile.region ?? '')}" placeholder="Ej: LATAM North"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Rol en juego</label>
          <select name="inGameRole"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar...</option>
            ${IN_GAME_ROLES.map(r => `<option value="${r}" ${profile.in_game_role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400">Email institucional</label>
          <input name="institutionalEmail" value="${escapeHtml(profile.institutional_email ?? '')}" placeholder="nombre@qu4sar.com"
            class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
        </div>
        ${profile.scholarship !== undefined ? `
        <div>
          <label class="block text-xs font-medium text-zinc-400">Beca</label>
          <p class="mt-1 text-sm text-zinc-300">${profile.scholarship ? 'Sí (completa)' : 'No'}</p>
        </div>` : ''}
      </div>

      <div>
        <h3 class="mb-3 text-sm font-medium text-zinc-300">Configuración de mouse</h3>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="block text-xs font-medium text-zinc-400">DPI</label>
            <input name="mouseDpi" type="number" value="${profile.mouse_dpi ?? ''}" placeholder="800"
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">Sensibilidad</label>
            <input name="mouseSens" type="number" step="0.01" value="${profile.mouse_sens ?? ''}" placeholder="0.35"
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">Scope Sens</label>
            <input name="mouseScopeSens" type="number" step="0.01" value="${profile.mouse_scope_sens ?? ''}" placeholder="1.00"
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">eDPI</label>
            <input name="edpi" id="edpi" type="number" value="${profile.edpi ?? ''}" placeholder="Auto"
              readonly
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">Frecuencia (Hz)</label>
            <input name="mouseHertz" type="number" value="${profile.mouse_hertz ?? ''}" placeholder="1000"
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>
      </div>

      <div>
        <h3 class="mb-3 text-sm font-medium text-zinc-300">Redes sociales</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-xs font-medium text-zinc-400">Discord</label>
            <input name="socialDiscord" value="${escapeHtml(profile.social_discord ?? '')}" placeholder="usuario#0000"
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">YouTube</label>
            <input name="socialYoutube" value="${escapeHtml(profile.social_youtube ?? '')}" placeholder="https://youtube.com/..."
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">Twitter</label>
            <input name="socialTwitter" value="${escapeHtml(profile.social_twitter ?? '')}" placeholder="@usuario"
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400">Twitch</label>
            <input name="socialTwitch" value="${escapeHtml(profile.social_twitch ?? '')}" placeholder="https://twitch.tv/..."
              class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>
      </div>

      <div class="border-t border-zinc-800 pt-6">
        <h3 class="mb-3 text-sm font-medium text-zinc-300">Perfil público</h3>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" name="pubIsPublic" value="true" ${pubEnabled ? 'checked' : ''}
                class="peer sr-only" />
              <div class="h-6 w-11 rounded-full bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#8B5CF6] peer-checked:after:translate-x-full"></div>
            </label>
            <span class="text-sm text-zinc-400">Habilitar perfil público</span>
          </div>
          <div id="pub-slug-field" class="${pubEnabled ? '' : 'hidden'}">
            ${publicUrl ? `
            <p class="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>${escapeHtml(publicUrl)}</span>
              <button type="button" onclick="navigator.clipboard.writeText('${escapeHtml(publicUrl)}')" class="text-[#8B5CF6] hover:underline">Copiar</button>
            </p>` : '<p class="text-xs text-zinc-500">Activa el perfil público para generar el enlace</p>'}
          </div>
        </div>
        <p id="pub-profile-error" class="mt-2 hidden text-xs text-red-400"></p>
        <p id="pub-profile-success" class="mt-2 hidden text-xs text-green-400"></p>
      </div>

      <p id="profile-error" class="hidden text-xs text-red-400"></p>
      <p id="profile-success" class="hidden text-xs text-green-400"></p>
      <button type="submit"
        class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
        Guardar cambios
      </button>
    </div>`
}

export function getPublicProfileFormData(form: HTMLFormElement) {
  const fd = new FormData(form)
  const rawSlug = (fd.get('pubSlug') as string)?.trim()
  const displayName = (fd.get('displayName') as string)?.trim() || (fd.get('fullName') as string)?.trim() || ''
  return {
    slug: rawSlug || slugify(displayName),
    is_public: fd.get('pubIsPublic') === 'true',
  }
}

export function getProfileFormData(form: HTMLFormElement) {
  const fd = new FormData(form)
  return {
    full_name: fd.get('fullName') as string,
    display_name: (fd.get('displayName') as string) || null,
    riot_id: (fd.get('riotId') as string) || null,
    rank: (fd.get('rank') as string) || '',
    bio: (fd.get('bio') as string) || '',
    country: (fd.get('country') as string) || null,
    region: (fd.get('region') as string) || null,
    in_game_role: (fd.get('inGameRole') as string) || null,
    institutional_email: (fd.get('institutionalEmail') as string) || null,
    role_color: (fd.get('roleColor') as string) || '#8B5CF6',
    mouse_dpi: fd.get('mouseDpi') ? Number(fd.get('mouseDpi')) : null,
    mouse_sens: fd.get('mouseSens') ? Number(fd.get('mouseSens')) : null,
    mouse_scope_sens: fd.get('mouseScopeSens') ? Number(fd.get('mouseScopeSens')) : null,
    edpi: fd.get('edpi') ? Number(fd.get('edpi')) : null,
    mouse_hertz: fd.get('mouseHertz') ? Number(fd.get('mouseHertz')) : null,
    social_discord: (fd.get('socialDiscord') as string) || null,
    social_youtube: (fd.get('socialYoutube') as string) || null,
    social_twitter: (fd.get('socialTwitter') as string) || null,
    social_twitch: (fd.get('socialTwitch') as string) || null,
  }
}

export function initMouseAutoCalc(): void {
  const dpi = document.querySelector<HTMLInputElement>('[name="mouseDpi"]')
  const sens = document.querySelector<HTMLInputElement>('[name="mouseSens"]')
  const edpi = document.getElementById('edpi') as HTMLInputElement
  if (!dpi || !sens || !edpi) return
  const calc = () => {
    const d = parseFloat(dpi.value)
    const s = parseFloat(sens.value)
    if (!isNaN(d) && !isNaN(s)) {
      edpi.value = String(Math.round(d * s * 100) / 100)
    } else {
      edpi.value = ''
    }
  }
  dpi.addEventListener('input', calc)
  sens.addEventListener('input', calc)
}
