'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ShareButton from '@/components/ShareButton'
import { incrementProfileViews } from './actions'
import {
  Award, Zap, Star, Cloud, Circle,
  User, Calendar, MapPin, Gamepad2, Target,
  Shield, Activity, Trophy,
  Video, ExternalLink,
} from 'lucide-react'

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

const COURSE_NAMES = ['Rookie','Rookie','Trainee','Trainee','Amateur','Contender','Competitor','Competitor','Elite','Semi-Pro','Semi-Pro','Pro']

function getCourseName(month: number) {
  return COURSE_NAMES[Math.max(0, Math.min(11, month - 1))] || 'Rookie'
}

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

function rankIcon(icon: string, color: string) {
  const props = { size: 28, color, strokeWidth: 1.5 }
  switch (icon) {
    case 'circle': return <Circle {...props} />
    case 'star': return <Star {...props} />
    case 'cloud': return <Cloud {...props} />
    case 'zap': return <Zap {...props} />
    case 'award': return <Award {...props} />
    default: return <Circle {...props} />
  }
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="border-b border-zinc-800/50 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3">
          <div className="h-6 w-16 rounded bg-zinc-800" />
          <div className="h-4 w-12 rounded bg-zinc-800" />
        </div>
      </header>
      <div className="mx-auto max-w-[640px] px-4 py-8">
        <div className="animate-pulse space-y-5">
          <div className="h-[200px] rounded-[20px] bg-zinc-800/50" />
          <div className="glass rounded-[18px] p-7 pb-5 text-center">
            <div className="mx-auto -mt-12 mb-3 flex justify-center">
              <div className="h-[90px] w-[90px] rounded-full bg-zinc-800" />
            </div>
            <div className="mx-auto h-6 w-40 rounded bg-zinc-800" />
            <div className="mx-auto mt-3 h-4 w-32 rounded bg-zinc-800" />
            <div className="mx-auto mt-4 h-8 w-24 rounded bg-zinc-800" />
          </div>
          <div className="h-40 rounded-[18px] bg-zinc-800/50" />
          <div className="h-40 rounded-[18px] bg-zinc-800/50" />
        </div>
      </div>
    </div>
  )
}

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [data, setData] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const client = createClient()

      const rawSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

      let pubProfileData: any = null

      let { data: pubProfileResult } = await client
        .from('public_profiles')
        .select('profile_id, slug, is_public, display_name, avatar_url, banner_url, bio, social_links')
        .eq('slug', rawSlug)
        .maybeSingle()
      pubProfileData = pubProfileResult

      if (!pubProfileData) {
        const { data: fb } = await client
          .from('public_profiles')
          .select('profile_id, slug, is_public, display_name, avatar_url, banner_url, bio, social_links')
          .eq('slug', slug)
          .maybeSingle()
        pubProfileData = fb
      }

      if (!pubProfileData) {
        const { data: profileBySlug } = await client
          .from('profiles')
          .select('id, full_name, avatar_url, display_name, bio')
          .eq('share_slug', slug.toLowerCase().replace(/[^a-z0-9-]/g, ''))
          .maybeSingle()

        if (profileBySlug) {
          pubProfileData = {
            profile_id: profileBySlug.id,
            slug: slug,
            is_public: true,
            display_name: profileBySlug.display_name ?? profileBySlug.full_name,
            avatar_url: profileBySlug.avatar_url,
            banner_url: null,
            bio: profileBySlug.bio,
            social_links: {},
          }
        }
      }

      if (!pubProfileData) { setNotFound(true); setLoading(false); return }

      const pubProfile = pubProfileData
      const profileId = pubProfile.profile_id

      const [profileRes, achievementsRes, vodsRes] = await Promise.all([
        client.from('profiles').select('*').eq('id', profileId).maybeSingle(),
        client.from('member_achievements').select('*').eq('profile_id', profileId).order('unlocked_at', { ascending: false }),
        client.from('member_vods').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
      ])

      const profile = profileRes.data ?? profileRes
      const achievements = achievementsRes.data
      const vods = vodsRes.data

      if (!profile) { setNotFound(true); setLoading(false); return }

      const achievementsArr = achievements ?? []
      const xp = achievementsArr.length * 150

      void incrementProfileViews(profileId)

      setData({
        profile,
        pubProfile,
        achievements: achievementsArr,
        vods: vods ?? [],
        xp,
        profileId,
      })
      setLoading(false)
    })()
  }, [slug])

  if (loading) return <LoadingSkeleton />

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <p className="text-zinc-500">Perfil no encontrado.</p>
      </div>
    )
  }

  const { profile, pubProfile, achievements, vods, xp } = data
  const rank = findRank(xp)
  const next = nextRank(xp)
  const xpInRank = xp - rank.minXP
  const nextXP = next ? next.minXP - rank.minXP : 1
  const xpPct = Math.min(100, Math.round((xpInRank / nextXP) * 100))
  const rankColor = rank.color
  const displayName = pubProfile.display_name ?? profile.display_name ?? profile.full_name ?? 'Usuario'
  const avatarUrl = pubProfile.avatar_url ?? profile.avatar_url ?? null
  const bannerUrl = pubProfile.banner_url ?? profile.banner_url ?? null
  const bio = pubProfile.bio ?? profile.bio ?? null
  const socialLinks = pubProfile.social_links as Record<string, string> | null

  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* Nav */}
      <header className="border-b border-zinc-800/50 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-lg font-bold tracking-wider text-white">
            Q<span className="text-[#8B5CF6]">4</span>SAR
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Inicio</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-4 py-8">

        <div className="flex flex-col gap-5">

            {/* Cover Banner */}
            <div className="relative overflow-hidden rounded-[20px]" style={{ height: 200 }}>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
                  backgroundColor: '#0a0514',
                }}
              />
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08), transparent 70%)',
              }} />
              <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{
                background: 'linear-gradient(transparent, rgba(10,5,20,0.95))',
              }} />
            </div>

            {/* Personal Card */}
            <div className="glass rounded-[18px] px-7 pb-5 pt-0 text-center -mt-16 relative z-10">
              <div className="flex justify-center -mt-12 mb-3">
                <div
                  className="h-[90px] w-[90px] rounded-full border-[3px] overflow-hidden"
                  style={{ borderColor: rankColor }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                      <User size={36} className="text-zinc-500" />
                    </div>
                  )}
                </div>
              </div>

              <h1 className="font-heading text-[22px] font-bold text-white">{displayName}</h1>

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {profile.in_game_role && (
                  <span className="rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-3 py-0.5 text-xs text-[#8B5CF6]">
                    {profile.in_game_role}
                  </span>
                )}
                {profile.region && (
                  <span className="rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-0.5 text-xs text-zinc-400">
                    {profile.region}
                  </span>
                )}
                {profile.role && profile.role !== 'student' && (
                  <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-0.5 text-xs text-green-400">
                    {profile.role === 'coach' ? 'Coach' : 'Player'}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                {profile.riot_id && (
                  <span className="flex items-center gap-1">
                    <Gamepad2 size={12} /> {profile.riot_id}
                  </span>
                )}
                {profile.country && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {profile.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(profile.created_at).getFullYear()}
                </span>
              </div>

              {bio && (
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{bio}</p>
              )}

              <div className="mt-4 flex items-center justify-center gap-2">
                <ShareButton />
              </div>
            </div>

            {/* Config */}
            {(profile.mouse_dpi || profile.mouse_sens != null || profile.mouse_scope_sens != null || profile.mouse_hertz || profile.edpi) && (
              <div className="glass rounded-[18px] p-6">
                <h3 className="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <Target size={14} style={{ color: '#8B5CF6' }} />
                  Configuración
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {profile.mouse_dpi && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">DPI</p>
                      <p className="mt-0.5 text-sm font-medium text-white">{profile.mouse_dpi}</p>
                    </div>
                  )}
                  {profile.mouse_sens != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Sensibilidad</p>
                      <p className="mt-0.5 text-sm font-medium text-white">{Number(profile.mouse_sens).toFixed(2)}</p>
                    </div>
                  )}
                  {profile.mouse_scope_sens != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Scope Sens</p>
                      <p className="mt-0.5 text-sm font-medium text-white">{Number(profile.mouse_scope_sens).toFixed(2)}</p>
                    </div>
                  )}
                  {profile.edpi && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">eDPI</p>
                      <p className="mt-0.5 text-sm font-medium text-white">{profile.edpi}</p>
                    </div>
                  )}
                  {profile.mouse_hertz && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Frecuencia</p>
                      <p className="mt-0.5 text-sm font-medium text-white">{profile.mouse_hertz} Hz</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VODs */}
            {vods && vods.length > 0 && (
              <div className="glass rounded-[18px] p-6">
                <h3 className="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <Video size={14} style={{ color: '#8B5CF6' }} />
                  VOD Reviews
                </h3>
                <div className="space-y-3">
                  {vods.map((vod: any) => (
                    <a
                      key={vod.id}
                      href={vod.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                    >
                      <Video size={16} className="mt-0.5 shrink-0 text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{vod.title}</p>
                        {vod.notes && <p className="mt-0.5 text-xs text-zinc-500">{vod.notes}</p>}
                      </div>
                      <ExternalLink size={12} className="mt-1 shrink-0 text-zinc-600" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {achievements && achievements.length > 0 && (
              <div className="glass rounded-[18px] p-6">
                <h3 className="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <Trophy size={14} style={{ color: '#8B5CF6' }} />
                  Logros
                </h3>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((ach: any) => (
                    <div
                      key={ach.id}
                      className="group relative flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 transition hover:border-[#8B5CF6]/30"
                    >
                      <Award size={14} className="text-[#8B5CF6]" />
                      <span className="text-xs text-zinc-300">{ach.title}</span>
                      {ach.description && (
                        <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 shadow-xl group-hover:block">
                          {ach.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

        </div>
      </div>
    </div>
  )
}
