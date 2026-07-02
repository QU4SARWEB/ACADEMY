import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { renderProfileForm, getProfileFormData, getPublicProfileFormData, initMouseAutoCalc, initPlaylistEditor, initRankSelector } from '@/2b3583/ddf4d5'
import { uploadFile, getAvatarPath, getBannerPath } from '@/2b3583/76ee3d'

export function renderStudentProfile(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentProfile(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const uid = session.user.id
    const [{ data: profile }, { data: pubProfile }, { data: teamMembers }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('public_profiles').select('*').eq('profile_id', uid).maybeSingle(),
      supabase.from('team_members').select('*, teams(name, id, logo_url, color, slug)').eq('profile_id', uid),
    ])
    if (!profile) return

    const teamIds = (teamMembers ?? []).map((tm: any) => tm.team_id)
    const { data: teamRosters } = teamIds.length > 0 ? await supabase
      .from('team_members')
      .select('*, teams(name, color, slug), profiles(full_name, avatar_url)')
      .in('team_id', teamIds)
    : { data: [] }

    const membersByTeam: Record<string, any[]> = {}
    for (const m of teamRosters ?? []) {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
      membersByTeam[m.team_id].push(m)
    }

    const teamsHtml = (teamMembers ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No perteneces a ningún equipo.</p>'
      : (teamMembers as any[]).map((tm: any) => {
          const color = tm.teams?.color || '#8B5CF6'
          const roster = membersByTeam[tm.team_id] || []
          return `
            <div class="mb-4 last:mb-0">
              <div class="mb-2 flex items-center gap-2">
                <span class="rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider" style="background:${color}15;color:${color};border:1px solid ${color}30">${escapeHtml(tm.teams?.slug || tm.teams?.name || '')}</span>
                <span class="text-sm font-semibold text-white">${escapeHtml(tm.teams?.name || '')}</span>
              </div>
              <div class="ml-1 space-y-1.5 border-l-2 border-zinc-700/50 pl-4">
                ${roster.map((m: any) => `
                  <div class="flex items-center gap-2 text-sm ${m.profile_id === uid ? '' : 'text-zinc-400'}" style="${m.profile_id === uid ? `color:${color}` : ''}">
                    <span class="h-1.5 w-1.5 rounded-full" style="background:${color}"></span>
                    <span>${escapeHtml(m.profiles?.full_name || 'Desconocido')}</span>
                    <span class="text-xs text-zinc-600">${escapeHtml(m.role || '')}</span>
                    ${m.profile_id === uid ? `<span class="text-xs" style="color:${color}">(tú)</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>`
        }).join('')

    const html = `
      <div class="max-w-6xl mx-auto">
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Mi Perfil</h1>
        <form id="profile-form" class="space-y-6">
          ${renderProfileForm(profile, pubProfile)}
        </form>
        <div class="mt-8">
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Equipos</h2>
          <div id="student-teams-list">${teamsHtml}</div>
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
