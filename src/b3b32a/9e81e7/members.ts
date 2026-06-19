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
    const { data: publicProfiles } = await supabase
      .from('public_profiles')
      .select('slug, display_name, avatar_url, banner_url, bio, profile_id, profiles!inner(role, full_name)')
      .eq('is_public', true)
      .order('display_name', { ascending: true })

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, banner_url, role, display_name, share_slug')
      .in('role', ['student', 'player', 'coach'])
      .order('full_name')

    const withPub = new Set((publicProfiles ?? []).map((p: any) => p.profile_id))
    const combined = [...(publicProfiles ?? []).map((p: any) => ({
      slug: p.slug,
      display_name: p.display_name || (p.profiles as any)?.full_name || 'Usuario',
      avatar_url: p.avatar_url,
      banner_url: p.banner_url,
      bio: p.bio,
      role: (p.profiles as any)?.role || 'student',
    }))]
    for (const prof of allProfiles ?? []) {
      if (!withPub.has(prof.id)) {
        combined.push({
          slug: prof.share_slug || `u-${prof.id.slice(0, 8)}`,
          display_name: prof.display_name || prof.full_name || 'Usuario',
          avatar_url: prof.avatar_url,
          banner_url: prof.banner_url,
          bio: null,
          role: prof.role,
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
            <div class="relative h-16 overflow-hidden bg-zinc-800">
              ${m.banner_url
                ? `<img src="${escapeHtml(m.banner_url)}" alt="" class="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />`
                : `<div class="h-full w-full" style="background:linear-gradient(135deg,#1a1a2e,#16213e)"></div>`
              }
            </div>
            <div class="flex flex-col items-center px-3 pb-4 pt-0 -mt-7">
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
