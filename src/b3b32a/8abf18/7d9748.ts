import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'
import { Spinner } from '@/4725dc/a14fa2'
import { renderProfileForm, getProfileFormData, getPublicProfileFormData, initMouseAutoCalc, initPlaylistEditor, initRankSelector } from '@/2b3583/ddf4d5'
import { uploadFile, getAvatarPath, getBannerPath } from '@/2b3583/76ee3d'

export function renderCoachProfile(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachProfile(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    if (!profile) return
    const { data: pubProfile } = await supabase.from('public_profiles').select('*').eq('profile_id', session.user.id).maybeSingle()

    const html = `
      <div class="max-w-6xl mx-auto">
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Mi Perfil</h1>
        <form id="profile-form" class="space-y-6">
          ${renderProfileForm(profile, pubProfile)}
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    const toggle = document.querySelector<HTMLInputElement>('[name="pubIsPublic"]')
    if (toggle) {
      toggle.addEventListener('change', () => {
        const field = document.getElementById('pub-slug-field')
        if (field) field.classList.toggle('hidden', !toggle.checked)
      })
    }

    const userId = session!.user.id
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
