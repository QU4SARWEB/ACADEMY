import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'
import { Spinner } from '@/4725dc/a14fa2'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { renderProfileForm, getProfileFormData, getPublicProfileFormData, initMouseAutoCalc, initPlaylistEditor, initRankSelector } from '@/2b3583/ddf4d5'
import { uploadFile, getAvatarPath, getBannerPath } from '@/2b3583/76ee3d'

export function renderCoachProfile(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachProfile(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const uid = session.user.id
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (!profile) return
    const { data: pubProfile } = await supabase.from('public_profiles').select('*').eq('profile_id', uid).maybeSingle()

    const { data: codes } = await supabase
      .from('referral_codes')
      .select('*, used_by_profiles:profiles!used_by(full_name)')
      .eq('coach_id', uid)
      .order('created_at', { ascending: false })

    const codesHtml = (codes ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No has generado c\u00f3digos de referido todav\u00eda.</p>'
      : (codes ?? []).map((c: any) => {
          const used = c.used_by ? true : false
          const usedName = c.used_by_profiles?.full_name || ''
          return `
          <div class="flex items-center justify-between rounded-lg border ${used ? 'border-zinc-800 bg-zinc-900/30' : 'border-[#8B5CF6]/30 bg-[#8B5CF6]/5'} px-4 py-3">
            <div class="flex items-center gap-3">
              <code class="rounded bg-zinc-800 px-2.5 py-1 text-sm font-mono font-bold text-white select-all">${escapeHtml(c.code)}</code>
              ${used
                ? '<span class="text-xs text-zinc-500">Usado por ' + escapeHtml(usedName) + '</span>'
                : '<span class="text-xs text-green-400">Disponible</span>'
              }
            </div>
            <div class="flex gap-2">
              ${!used ? `
              <button class="copy-code-btn text-xs text-zinc-400 hover:text-white transition" data-code="${escapeHtml(c.code)}">${Icon('copy', 14)}</button>
              <button class="toggle-code-btn text-xs text-zinc-400 hover:text-red-400 transition" data-id="${escapeHtml(c.id)}" data-active="${c.is_active ? '1' : '0'}">
                ${c.is_active ? Icon('x', 14) : Icon('check', 14)}
              </button>` : ''}
            </div>
          </div>`
        }).join('')

    const html = `
      <div class="max-w-6xl mx-auto">
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Mi Perfil</h1>
        <form id="profile-form" class="space-y-6">
          ${renderProfileForm(profile, pubProfile)}
        </form>
        <div class="mt-10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-heading text-lg font-bold text-white">C\u00f3digos de referido</h2>
            <button id="btn-generate-code" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED] transition">${Icon('plus', 14)} Generar c\u00f3digo</button>
          </div>
          <p class="text-xs text-zinc-500 mb-4">Comparte estos c\u00f3digos con nuevos alumnos. Al registrarse con tu c\u00f3digo, quedar\u00e1n vinculados a ti.</p>
          <div id="codes-list" class="space-y-2">${codesHtml}</div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    const toggle = document.querySelector<HTMLInputElement>('[name="pubIsPublic"]')
    if (toggle) {
      toggle.addEventListener('change', () => {
        const field = document.getElementById('pub-slug-field')
        if (field) field.classList.toggle('hidden', !toggle.checked)
      })
    }

    // Referral codes
    document.getElementById('btn-generate-code')?.addEventListener('click', async () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const { error } = await supabase.from('referral_codes').insert({
        code, coach_id: uid, is_active: true,
      })
      if (error) { toast('error', error.message); return }
      toast('success', 'C\u00f3digo ' + code + ' generado')
      initCoachProfile()
    })

    document.getElementById('codes-list')?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const copyBtn = target.closest('.copy-code-btn') as HTMLElement
      if (copyBtn) {
        const code = copyBtn.dataset.code
        if (code) {
          try {
            await navigator.clipboard.writeText(code)
            toast('success', 'C\u00f3digo copiado: ' + code)
          } catch { toast('error', 'No se pudo copiar') }
        }
        return
      }
      const toggleBtn = target.closest('.toggle-code-btn') as HTMLElement
      if (toggleBtn) {
        const id = toggleBtn.dataset.id
        const active = toggleBtn.dataset.active === '1'
        const { error } = await supabase.from('referral_codes').update({ is_active: !active }).eq('id', id)
        if (error) { toast('error', error.message); return }
        toast('success', active ? 'C\u00f3digo desactivado' : 'C\u00f3digo activado')
        initCoachProfile()
      }
    })

    const userId = uid
    async function handleImageUpload(inputId: string, statusId: string, bucket: string, pathFn: (uid: string, name: string) => string) {
      const input = document.getElementById(inputId) as HTMLInputElement
      const file = input?.files?.[0]
      if (!file) return
      const status = document.getElementById(statusId)
      if (status) status.classList.remove('hidden')
      const ext = file.name.split('.').pop()
      const path = pathFn(userId, `img.${ext}`)
      const { url, error: uploadErr } = await uploadFile(bucket, path, file)
      input.value = ''
      if (status) status.classList.add('hidden')
      if (uploadErr) { toast('error', uploadErr); return }
      if (url) {
        const col = bucket === 'avatars' ? 'avatar_url' : 'banner_url'
        await supabase.from('profiles').update({ [col]: url }).eq('id', userId)
        const imgId = bucket === 'avatars' ? 'avatar-img' : 'banner-img'
        const img = document.getElementById(imgId)
        if (img) (img as HTMLImageElement).src = url
        toast('success', `${bucket === 'avatars' ? 'Avatar' : 'Banner'} actualizado`)
      }
    }

    document.getElementById('avatar-upload')?.addEventListener('change', () => {
      handleImageUpload('avatar-upload', 'avatar-upload-status', 'avatars', getAvatarPath)
    })
    document.getElementById('banner-upload')?.addEventListener('change', () => {
      handleImageUpload('banner-upload', 'banner-upload-status', 'banners', getBannerPath)
    })

    initMouseAutoCalc()
    initPlaylistEditor()
    initRankSelector(profile.rank)

    document.getElementById('profile-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data = getProfileFormData(e.target as HTMLFormElement)
      const { error } = await supabase.from('profiles').update(data).eq('id', session.user.id)

      const errorEl = document.getElementById('profile-error')!
      const successEl = document.getElementById('profile-success')!
      if (error) {
        errorEl.textContent = error.message; errorEl.classList.remove('hidden'); successEl.classList.add('hidden')
      } else {
        successEl.textContent = 'Perfil actualizado correctamente'; successEl.classList.remove('hidden'); errorEl.classList.add('hidden')
        toast('success', 'Perfil actualizado')
      }

      const pubData = getPublicProfileFormData(e.target as HTMLFormElement)
      const { error: pubErr } = await supabase.from('public_profiles').upsert(
        { profile_id: session.user.id, ...pubData },
        { onConflict: 'profile_id' }
      )
      const pubErrorEl = document.getElementById('pub-profile-error')!
      const pubSuccessEl = document.getElementById('pub-profile-success')!
      if (pubErr) {
        pubErrorEl.textContent = pubErr.message; pubErrorEl.classList.remove('hidden'); pubSuccessEl.classList.add('hidden')
      } else {
        pubSuccessEl.textContent = 'Perfil público actualizado'; pubSuccessEl.classList.remove('hidden'); pubErrorEl.classList.add('hidden')
      }
    })
  } catch (err) {
    console.error('Error loading profile:', err)
    const pc = document.getElementById('page-content')
    if (pc) pc.innerHTML = '<p class="text-red-400 text-sm">Error al cargar perfil</p>'
  }
}
