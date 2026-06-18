import { supabase } from '@/304244'
import { Spinner } from '@/4725dc/a14fa2'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

const ACADEMY_RANKS = [
  { id: 'cosmic1', name: 'Cosmic I',   minXP: 0,     color: '#6b7280', glow: 'rgba(107,114,128,0.3)', icon: 'circle', reward: 'Acceso a clases grupales' },
  { id: 'cosmic2', name: 'Cosmic II',  minXP: 500,   color: '#9ca3af', glow: 'rgba(156,163,175,0.3)', icon: 'circle', reward: 'Acceso a material de estudio' },
  { id: 'cosmic3', name: 'Cosmic III', minXP: 1500,  color: '#d1d5db', glow: 'rgba(209,213,219,0.3)', icon: 'circle', reward: 'Evaluación inicial' },
  { id: 'nova1',   name: 'Nova I',     minXP: 3000,  color: '#818cf8', glow: 'rgba(129,140,248,0.3)', icon: 'star',   reward: 'Coach asignado' },
  { id: 'nova2',   name: 'Nova II',    minXP: 5000,  color: '#6366f1', glow: 'rgba(99,102,241,0.3)',   icon: 'star',   reward: 'Scrims semanales' },
  { id: 'nova3',   name: 'Nova III',   minXP: 7500,  color: '#4f46e5', glow: 'rgba(79,70,229,0.3)',   icon: 'star',   reward: 'Análisis VOD personal' },
  { id: 'nebula1', name: 'Nebula I',   minXP: 10000, color: '#a78bfa', glow: 'rgba(167,139,250,0.3)', icon: 'cloud',  reward: 'Rol de mentoría' },
  { id: 'nebula2', name: 'Nebula II',  minXP: 15000, color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)',  icon: 'cloud',  reward: 'Insignia exclusiva' },
  { id: 'nebula3', name: 'Nebula III', minXP: 20000, color: '#7c3aed', glow: 'rgba(124,58,237,0.3)',  icon: 'cloud',  reward: 'Participación en drafts' },
  { id: 'quasar1', name: 'Quasar I',   minXP: 30000, color: '#f59e0b', glow: 'rgba(245,158,11,0.3)',  icon: 'zap',    reward: 'Team principal tryouts' },
  { id: 'quasar2', name: 'Quasar II',  minXP: 45000, color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  icon: 'zap',    reward: 'Contenido promocional' },
  { id: 'quasar3', name: 'Quasar III', minXP: 60000, color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  icon: 'award',  reward: 'Estatus Legendario' },
]

function findRank(xp: number) {
  let rank = ACADEMY_RANKS[0]
  for (const r of ACADEMY_RANKS) {
    if (xp >= r.minXP) rank = r
  }
  return rank
}

function nextRank(xp: number) {
  for (const r of ACADEMY_RANKS) {
    if (xp < r.minXP) return r
  }
  return null
}

function rankSvg(icon: string, color: string): string {
  const s = 28
  const svg = (inner: string) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  switch (icon) {
    case 'circle': return svg('<circle cx="12" cy="12" r="10"/>')
    case 'star': return svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>')
    case 'cloud': return svg('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>')
    case 'zap': return svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>')
    case 'award': return svg('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>')
    default: return svg('<circle cx="12" cy="12" r="10"/>')
  }
}

export function renderPublicProfile(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPublicProfile(): Promise<void> {
  try {
    const hash = window.location.hash.replace('#', '')
    const match = hash.match(/^\/p\/(.+)$/)
    if (!match) {
      document.getElementById('page-content')!.innerHTML = '<div class="flex min-h-screen items-center justify-center bg-[#0A0A0A]"><p class="text-zinc-500">Perfil no encontrado.</p></div>'
      return
    }
    const slug = match[1].toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!slug) {
      document.getElementById('page-content')!.innerHTML = '<div class="flex min-h-screen items-center justify-center bg-[#0A0A0A]"><p class="text-zinc-500">Perfil no encontrado.</p></div>'
      return
    }

    let pubProfile: any = null

    const { data: pp1 } = await supabase
      .from('public_profiles')
      .select('profile_id, slug, is_public, display_name, avatar_url, banner_url, bio, social_links')
      .eq('slug', slug)
      .maybeSingle()

    if (pp1) {
      pubProfile = pp1
    } else {
      const { data: pp2 } = await supabase
        .from('public_profiles')
        .select('profile_id, slug, is_public, display_name, avatar_url, banner_url, bio, social_links')
        .eq('slug', match[1])
        .maybeSingle()
      if (pp2) pubProfile = pp2
    }

    if (!pubProfile) {
      const { data: profileBySlug } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, display_name, bio')
        .eq('share_slug', slug.replace(/[^a-z0-9-]/g, ''))
        .maybeSingle()
      if (profileBySlug) {
        pubProfile = {
          profile_id: profileBySlug.id,
          slug,
          is_public: true,
          display_name: profileBySlug.display_name ?? profileBySlug.full_name,
          avatar_url: profileBySlug.avatar_url,
          banner_url: null,
          bio: profileBySlug.bio,
          social_links: {},
        }
      }
    }

    if (!pubProfile) {
      document.getElementById('page-content')!.innerHTML = '<div class="flex min-h-screen items-center justify-center bg-[#0A0A0A]"><p class="text-zinc-500">Perfil no encontrado.</p></div>'
      return
    }

    const profileId = pubProfile.profile_id

    const [profileRes, achievementsRes, vodsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
      supabase.from('member_achievements').select('*').eq('profile_id', profileId).order('unlocked_at', { ascending: false }),
      supabase.from('member_vods').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
    ])

    const profile = profileRes.data
    const achievements = achievementsRes.data ?? []
    const vods = vodsRes.data ?? []

    if (!profile) {
      document.getElementById('page-content')!.innerHTML = '<div class="flex min-h-screen items-center justify-center bg-[#0A0A0A]"><p class="text-zinc-500">Perfil no encontrado.</p></div>'
      return
    }

    void supabase.rpc('increment_profile_views', { profile_id: profileId })

    const xp = achievements.length * 150
    const rank = findRank(xp)
    const next = nextRank(xp)
    const xpInRank = xp - rank.minXP
    const nextXP = next ? next.minXP - rank.minXP : 1
    const xpPct = Math.min(100, Math.round((xpInRank / nextXP) * 100))
    const rankColor = rank.color
    const displayName = pubProfile.display_name ?? profile.display_name ?? profile.full_name ?? 'Usuario'
    const avatarUrl = pubProfile.avatar_url ?? profile.avatar_url
    const bannerUrl = pubProfile.banner_url ?? profile.banner_url
    const bio = pubProfile.bio ?? profile.bio
    const socialLinks = pubProfile.social_links as Record<string, string> | null
    const currentUrl = encodeURIComponent(window.location.href)

    const hasConfig = profile.mouse_dpi || profile.mouse_sens != null || profile.mouse_scope_sens != null || profile.mouse_hertz || profile.edpi
    const quote = profile.quote as string | null
    const socialIcons: Record<string, string> = { discord: 'Mail', youtube: 'Play', twitter: 'Bell', twitch: 'Play' }

    const html = `
<div class="min-h-screen bg-[#0A0A0A]" id="profile-page">
  <header class="border-b border-zinc-800/50 bg-[#0A0A0A]/80 backdrop-blur-md">
    <div class="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3">
      <a href="#/" class="font-heading text-lg font-bold tracking-wider text-white">QU<span class="text-[#8B5CF6]">4</span>SAR</a>
      <nav class="flex items-center gap-4">
        <a href="#/" class="text-sm text-zinc-400 transition-colors hover:text-white">Inicio</a>
        <button id="download-btn" class="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white">${Icon('download', 12)} PNG</button>
      </nav>
    </div>
  </header>
  <div class="mx-auto max-w-[640px] px-4 py-8">
    <div class="flex flex-col gap-5" id="profile-card">

      <div class="relative overflow-hidden rounded-[20px]" style="height:200px">
        <div class="absolute inset-0 bg-cover bg-center" style="${bannerUrl ? `background-image:url(${bannerUrl})` : 'background-color:#0a0514'}"></div>
        <div class="absolute inset-0" style="background:radial-gradient(ellipse at 50% 0%,rgba(139,92,246,0.08),transparent 70%)"></div>
        <div class="absolute bottom-0 left-0 right-0 h-1/2" style="background:linear-gradient(transparent,rgba(10,5,20,0.95))"></div>
        <div class="absolute bottom-0 left-0 right-0 flex justify-between items-end px-6 pb-4">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="h-[90px] w-[90px] rounded-full border-[3px] overflow-hidden" style="border-color:${rankColor}">
                ${avatarUrl
                  ? `<img src="${escapeHtml(avatarUrl)}" alt="" class="h-full w-full object-cover" />`
                  : `<div class="flex h-full w-full items-center justify-center bg-zinc-800">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                     </div>`
                }
              </div>
            </div>
            <div>
              <h1 class="font-heading text-[22px] font-bold text-white">${escapeHtml(displayName)}</h1>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-sm font-medium flex items-center gap-1.5" style="color:${rankColor}">${rankSvg(rank.icon, rank.color)}${rank.name}</span>
                <span class="text-xs text-zinc-500">${xp} XP</span>
                ${profile.role === 'coach' ? `<span class="rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2 py-0.5 text-[10px] text-[#8B5CF6]">Coach</span>` : profile.role === 'player' ? `<span class="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">Player</span>` : ''}
              </div>
            </div>
          </div>
          <button id="download-btn-2" class="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-white/20 flex items-center gap-1.5">${Icon('download', 11)} Descargar</button>
        </div>
      </div>

      ${quote ? `
      <div class="glass rounded-[18px] px-7 py-5 text-center">
        <p class="text-sm italic text-zinc-400">"${escapeHtml(quote)}"</p>
      </div>` : ''}

      <!-- Stats Row -->
      <div class="grid grid-cols-4 gap-3">
        ${(() => {
          const totalAchievements = achievements.length
          const totalVods = vods.length
          const estTasks = Math.floor(xp / 100)
          return `
          <div class="glass rounded-[14px] p-3 text-center">
            <p class="text-lg font-bold text-white">${totalAchievements}</p>
            <p class="text-[10px] text-zinc-500">Logros</p>
          </div>
          <div class="glass rounded-[14px] p-3 text-center">
            <p class="text-lg font-bold text-white">${totalVods}</p>
            <p class="text-[10px] text-zinc-500">VODs</p>
          </div>
          <div class="glass rounded-[14px] p-3 text-center">
            <p class="text-lg font-bold text-white">${estTasks}</p>
            <p class="text-[10px] text-zinc-500">Tareas</p>
          </div>
          <div class="glass rounded-[14px] p-3 text-center">
            <p class="text-lg font-bold text-white">${xp}</p>
            <p class="text-[10px] text-zinc-500">XP total</p>
          </div>`
        })()}
      </div>

      <div class="glass rounded-[18px] px-7 pb-5 pt-5">
        <div class="flex flex-wrap gap-2">
          ${profile.in_game_role ? `<span class="rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-3 py-0.5 text-xs text-[#8B5CF6]">${escapeHtml(profile.in_game_role)}</span>` : ''}
          ${profile.region ? `<span class="rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-0.5 text-xs text-zinc-400">${escapeHtml(profile.region)}</span>` : ''}
          ${profile.rank ? `<span class="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-0.5 text-xs text-yellow-400">${escapeHtml(profile.rank)}</span>` : ''}
        </div>
        <div class="mt-3 flex flex-wrap justify-start gap-x-4 gap-y-1 text-xs text-zinc-500">
          ${profile.riot_id ? `<span class="flex items-center gap-1">${Icon('target', 12)} ${escapeHtml(profile.riot_id)}</span>` : ''}
          ${profile.country ? `<span class="flex items-center gap-1">${Icon('mapPin', 12)} ${escapeHtml(profile.country)}</span>` : ''}
          <span class="flex items-center gap-1">${Icon('calendar', 12)} Miembro desde ${new Date(profile.created_at).getFullYear()}</span>
        </div>
        ${bio ? `<p class="mt-3 text-sm text-zinc-400 leading-relaxed">${escBr(bio)}</p>` : ''}
        ${socialLinks && Object.keys(socialLinks).length > 0 ? `
        <div class="mt-4 flex flex-wrap gap-2">
          ${Object.entries(socialLinks).map(([key, url]) => `
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-[#8B5CF6]/30 hover:text-white">
              ${Icon(socialIcons[key] || 'externalLink', 12)} ${key.charAt(0).toUpperCase() + key.slice(1)}
            </a>
          `).join('')}
        </div>` : ''}
      </div>

      <div class="glass rounded-[18px] p-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm text-zinc-500">Progreso hacia ${next ? next.name : 'máximo'}</span>
          <span class="text-xs text-zinc-500" style="color:${rankColor}">${xpPct}%</span>
        </div>
        <div class="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div class="h-full rounded-full transition-all" style="width:${xpPct}%;background:${rankColor}"></div>
        </div>
        <div class="mt-2 flex justify-between text-xs text-zinc-600">
          <span>${rank.name} (${xp - rank.minXP} XP)</span>
          <span>${next ? next.name + ` (${next.minXP - xp} XP restantes)` : 'Máximo alcanzado'}</span>
        </div>
      </div>

      ${hasConfig ? `
      <div class="glass rounded-[18px] p-6">
        <h3 class="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style="border-bottom:1px solid rgba(139,92,246,0.06)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Configuración
        </h3>
        <div class="grid grid-cols-2 gap-4">
          ${profile.mouse_dpi ? `<div><p class="text-[10px] uppercase tracking-wider text-zinc-500">DPI</p><p class="mt-0.5 text-sm font-medium text-white">${profile.mouse_dpi}</p></div>` : ''}
          ${profile.mouse_sens != null ? `<div><p class="text-[10px] uppercase tracking-wider text-zinc-500">Sensibilidad</p><p class="mt-0.5 text-sm font-medium text-white">${Number(profile.mouse_sens).toFixed(2)}</p></div>` : ''}
          ${profile.mouse_scope_sens != null ? `<div><p class="text-[10px] uppercase tracking-wider text-zinc-500">Scope Sens</p><p class="mt-0.5 text-sm font-medium text-white">${Number(profile.mouse_scope_sens).toFixed(2)}</p></div>` : ''}
          ${profile.edpi ? `<div><p class="text-[10px] uppercase tracking-wider text-zinc-500">eDPI</p><p class="mt-0.5 text-sm font-medium text-white">${profile.edpi}</p></div>` : ''}
          ${profile.mouse_hertz ? `<div><p class="text-[10px] uppercase tracking-wider text-zinc-500">Frecuencia</p><p class="mt-0.5 text-sm font-medium text-white">${profile.mouse_hertz} Hz</p></div>` : ''}
        </div>
      </div>` : ''}

      ${vods.length > 0 ? `
      <div class="glass rounded-[18px] p-6">
        <h3 class="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style="border-bottom:1px solid rgba(139,92,246,0.06)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          VOD Reviews
        </h3>
        <div class="space-y-3">
          ${vods.map((vod: any) => `
          <a href="${escapeHtml(vod.url)}" target="_blank" rel="noopener noreferrer" class="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-white">${escapeHtml(vod.title)}</p>
              ${vod.notes ? `<p class="mt-0.5 text-xs text-zinc-500">${escapeHtml(vod.notes)}</p>` : ''}
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-1 shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>`).join('')}
        </div>
      </div>` : ''}

      ${achievements.length > 0 ? `
      <div class="glass rounded-[18px] p-6">
        <h3 class="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style="border-bottom:1px solid rgba(139,92,246,0.06)">
          ${Icon('trophy', 14)} Logros
        </h3>
        <div class="flex flex-wrap gap-2">
          ${achievements.map((ach: any) => `
          <div class="group relative flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 transition hover:border-[#8B5CF6]/30">
            ${Icon('trophy', 12)}
            <span class="text-xs text-zinc-300">${escapeHtml(ach.title)}</span>
            ${ach.description ? `<div class="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 shadow-xl group-hover:block">${escBr(ach.description)}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>` : ''}

    </div>
  </div>
</div>`

    document.getElementById('page-content')!.innerHTML = html

    // Download as PNG
    async function downloadProfile() {
      try {
        const card = document.getElementById('profile-card')
        if (!card) return
        // Load dom-to-image-more via script tag
        if (!(window as any).domtoimage) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://cdn.jsdelivr.net/npm/dom-to-image-more@3.1.6/dist/dom-to-image-more.min.js'
            s.onload = () => resolve()
            s.onerror = () => reject(new Error('Failed to load dom-to-image-more'))
            document.head.appendChild(s)
          })
        }
        const dti = (window as any).domtoimage
        const canvas = await dti.toCanvas(card, {
          bgColor: '#0A0A0A',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          filter: (node: any) => node.tagName !== 'SCRIPT',
          style: { 'backdrop-filter': 'none', '-webkit-backdrop-filter': 'none' },
        })
        const link = document.createElement('a')
        link.download = `perfil-${slug}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } catch (e) {
        console.error('Error generating PNG:', e)
      }
    }

    document.getElementById('download-btn')?.addEventListener('click', downloadProfile)
    document.getElementById('download-btn-2')?.addEventListener('click', downloadProfile)
  } catch (err) {
    console.error('Error loading public profile:', err)
    const pc = document.getElementById('page-content')
    if (pc) pc.innerHTML = '<div class="flex min-h-screen items-center justify-center bg-[#0A0A0A]"><p class="text-red-400 text-sm">Error al cargar perfil</p></div>'
  }
}
