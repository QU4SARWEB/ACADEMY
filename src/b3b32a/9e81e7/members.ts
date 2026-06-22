import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

const ROLE_LABELS: Record<string, string> = { coach: 'Coach', student: 'Estudiante', player: 'Jugador' }
const ROLE_COLORS: Record<string, string> = { coach: 'text-purple-400 bg-purple-500/10 border-purple-500/30', student: 'text-blue-400 bg-blue-500/10 border-blue-500/30', player: 'text-green-400 bg-green-500/10 border-green-500/30' }

export function renderMembers(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initMembers(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    let isCoach = false
    if (session?.user?.id) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (prof?.role === 'coach') isCoach = true
    }

    // Fetch public profiles (for non-coaches) + all profiles
    let combined: any[] = []
    if (!isCoach) {
      const { data: pubData } = await supabase
        .from('public_profiles')
        .select('slug, display_name, avatar_url, banner_url, bio, profile_id')
        .eq('is_public', true)
        .order('display_name', { ascending: true })
      const pubIds = [...new Set((pubData ?? []).map((p: any) => p.profile_id))]
      const { data: pubProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, banner_url, riot_id, social_discord')
        .in('id', pubIds.length ? pubIds : ['00000000-0000-0000-0000-000000000000'])
      const profMap: Record<string, any> = {}
      for (const p of pubProfiles ?? []) profMap[p.id] = p
      combined = (pubData ?? []).map((p: any) => {
        const prof = profMap[p.profile_id] || {}
        return {
          slug: p.slug,
          display_name: [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || 'Usuario',
          avatar_url: p.avatar_url || prof.avatar_url,
          banner_url: p.banner_url || prof.banner_url,
          bio: p.bio,
          role: prof.role || 'student',
          profId: p.profile_id,
        }
      })
    }

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, banner_url, role, display_name, share_slug, riot_id, social_discord')
      .in('role', ['student', 'player', 'coach'])
      .order('full_name')

    const existingIds = new Set(combined.map((m: any) => m.profId))
    for (const prof of allProfiles ?? []) {
      if (isCoach || !existingIds.has(prof.id)) {
        combined.push({
          slug: prof.share_slug || `u-${prof.id.slice(0, 8)}`,
          display_name: [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || 'Usuario',
          avatar_url: prof.avatar_url,
          banner_url: prof.banner_url,
          bio: null,
          role: prof.role,
          profId: prof.id,
        })
      }
    }

    const total = combined.length

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Miembros</h1>
        <p class="mt-1 text-sm text-zinc-500">${total} miembros registrados</p>
      </div>

      ${total === 0
        ? '<p class="text-sm text-zinc-500">No hay miembros registrados.</p>'
        : `<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          ${combined.map((m) => `
          <a href="#/p/${escapeHtml(m.slug)}"
             class="group glass relative flex flex-col overflow-hidden rounded-xl transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5">
            ${m.banner_url ? `<div class="relative h-14 overflow-hidden bg-zinc-800">
                <img src="${escapeHtml(m.banner_url)}" alt="" class="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
              </div>` : ''}
            <div class="flex flex-col items-center px-3 pb-4 pt-0 ${m.banner_url ? '-mt-6' : 'mt-4'}">
              <div class="relative mb-2 h-12 w-12 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900 shadow-lg">
                ${m.avatar_url
                  ? `<img src="${escapeHtml(m.avatar_url)}" alt="" class="h-full w-full object-cover" loading="lazy" />`
                  : `<div class="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">${escapeHtml(m.display_name.charAt(0).toUpperCase())}</div>`
                }
              </div>
              <p class="truncate text-center text-sm font-medium text-white">${escapeHtml(m.display_name)}</p>
              <span class="mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${ROLE_COLORS[m.role] || 'text-zinc-500'}">${ROLE_LABELS[m.role] || m.role}</span>
              ${m.bio ? `<p class="mt-2 line-clamp-2 text-center text-[11px] leading-relaxed text-zinc-500">${escBr(m.bio)}</p>` : ''}
            </div>
          </a>`).join('')}
        </div>`
      }
    `

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading members:', err)
    const pc = document.getElementById('page-content')
    if (pc) pc.innerHTML = '<p class="text-red-400 text-sm">Error al cargar miembros</p>'
  }
}
