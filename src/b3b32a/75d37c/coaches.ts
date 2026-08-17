import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { rankBadge } from '@/2b3583/ranks'

export function renderStudentCoaches(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentCoaches(): Promise<void> {
  try {
    const page = document.getElementById('page-content')
    if (!page) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [{ data: myProfile }, { data: coaches }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle(),
      supabase.from('profiles').select('id, display_name, full_name, avatar_url, bio, rank, role_color, presentation_image, country').eq('role', 'coach').order('full_name'),
    ])

    const list = (coaches ?? []).map((coach: any) => {
      const name = coach.display_name || coach.full_name || 'Coach'
      const accent = coach.role_color || '#8B5CF6'
      const image = coach.presentation_image || coach.avatar_url
      return `
        <article class="glass rounded-xl p-5 flex flex-col gap-4 transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5">
          <div class="flex items-center gap-4">
            <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2" style="background:${accent}20;color:${accent};--tw-ring-color:${accent}40">
              ${image
                ? `<img src="${escapeHtml(image)}" alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" />`
                : `<div class="flex h-full w-full items-center justify-center text-lg font-bold">${escapeHtml(name.charAt(0).toUpperCase())}</div>`}
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-medium text-white">${escapeHtml(name)}</h3>
              <p class="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                ${coach.rank ? `${rankBadge(coach.rank, 16)} ${escapeHtml(coach.rank)}` : 'Coach'}
                ${coach.country ? ` · ${escapeHtml(coach.country)}` : ''}
              </p>
            </div>
          </div>
          ${coach.bio ? `<p class="text-xs text-zinc-400 line-clamp-2">${escapeHtml(coach.bio)}</p>` : ''}
          <a href="#/chat?with=${encodeURIComponent(coach.id)}" class="mt-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition" style="background:${accent};hover:opacity-90">
            ${Icon('mail', 15)} Enviar mensaje
          </a>
        </article>`
    }).join('')

    page.innerHTML = `
      <div class="mb-6">
        <span class="kicker">Tu staff</span>
        <h1 class="font-heading text-2xl font-bold text-white">Coaches</h1>
        <p class="mt-1 text-sm text-zinc-500">Conoce a los coaches de QU4SAR Academy y escríbeles cuando quieras.</p>
      </div>
      ${(coaches ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">Aún no hay coaches registrados.</p>'
        : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 rt-carousel">${list}</div>`}
      ${myProfile?.role === 'coach' ? '<p class="mt-6 text-xs text-zinc-600">Ves esta página en modo coach. Los alumnos la usan para contactarte.</p>' : ''}
    `
  } catch (err) {
    console.error('Error loading coaches:', err)
    const page = document.getElementById('page-content')
    if (page) page.innerHTML = '<p class="text-red-400 text-sm">Error al cargar coaches</p>'
  }
}