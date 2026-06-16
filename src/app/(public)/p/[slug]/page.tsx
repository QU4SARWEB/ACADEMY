import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ShareButton from '@/components/ShareButton'
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

async function getProfileData(slug: string) {
  const admin = createAdminClient()
  const client = admin ?? await createClient()

  const rawSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  let { data: pubProfileData } = await client
    .from('public_profiles')
    .select('profile_id, slug, is_public, display_name, avatar_url, banner_url, bio, social_links')
    .eq('slug', rawSlug)
    .maybeSingle()

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

  if (!pubProfileData) return null

  const pubProfile = pubProfileData as any
  const profileId = pubProfile.profile_id

  const [profileRes, enrollmentsRes, achievementsRes, vodsRes, coachAssignmentsRes] = await Promise.all([
    client.from('profiles').select('*').eq('id', profileId).maybeSingle(),
    admin
      ? admin.from('enrollments').select('*, courses(name, slug, display_order, min_rank, description, duration_months), seasons(name, start_date, end_date, is_active)').eq('profile_id', profileId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    client.from('member_achievements').select('*').eq('profile_id', profileId).order('unlocked_at', { ascending: false }),
    client.from('member_vods').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
    admin
      ? admin.from('coach_assignments').select('*, profiles!coach_assignments_coach_id_fkey(id, full_name, display_name, avatar_url, role)').eq('student_id', profileId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const profile: any = (profileRes as any)?.data ?? profileRes
  const enrollments = enrollmentsRes.data as any[] | null
  const achievements = achievementsRes.data as any[] | null
  const vods = vodsRes.data as any[] | null
  const coachAssignment = coachAssignmentsRes.data as any | null

  let xp = 0
  let grades: any = null

  if (admin && enrollments && enrollments.length > 0) {
    const activeEnrollment = enrollments.find((e: any) => e.status === 'active' || e.status === 'recovery') ?? enrollments[0]
    const enrollmentId = activeEnrollment.id

    const [achCount, taskCount, evalCount, attCount] = await Promise.all([
      admin.from('member_achievements').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
      admin.from('task_submissions').select('*', { count: 'exact', head: true }).eq('enrollment_id', enrollmentId),
      admin.from('evaluation_results').select('score').eq('enrollment_id', enrollmentId),
      admin.from('attendance').select('*', { count: 'exact', head: true }).eq('enrollment_id', enrollmentId).in('status', ['present', 'late']),
    ])

    xp += (achCount.count ?? 0) * 150
    xp += (taskCount.count ?? 0) * 75
    const evalScores = (evalCount.data as any[] | null) ?? []
    if (evalScores.length > 0) {
      const avg = evalScores.reduce((s: number, e: any) => s + (e.score ?? 0), 0) / evalScores.length
      xp += Math.round(avg * 10)
    }
    xp += (attCount.count ?? 0) * 25

    const { getGradeBreakdown } = await import('@/services/grades')
    try {
      grades = await getGradeBreakdown(admin, enrollmentId)
    } catch {}
  }

  return {
    profile,
    pubProfile,
    enrollments,
    achievements,
    vods,
    coachAssignment,
    xp,
    grades,
    isAdmin: !!admin,
    profileId,
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getProfileData(slug)

  if (!data || !data.profile) notFound()

  const { profile, enrollments, achievements, vods, coachAssignment, xp, grades, pubProfile, profileId } = data
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

  const activeEnrollment = enrollments?.find((e: any) => e.status === 'active' || e.status === 'recovery') ?? enrollments?.[0]
  const currentMonth = activeEnrollment?.current_module ?? 1
  const totalMonths = activeEnrollment?.courses?.duration_months ?? 2
  const courseProgress = Math.round((currentMonth / totalMonths) * 100)

  async function incrementViews() {
    'use server'
    const client = await createClient()
    void client.rpc('increment_profile_views', { profile_id: profileId })
  }
  incrementViews()

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

          {/* Current Course */}
            {activeEnrollment && (
              <div className="glass rounded-[18px] p-6">
                <h3 className="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <Shield size={14} style={{ color: '#8B5CF6' }} />
                  Curso Actual
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-base font-bold text-white">
                        {getCourseName(currentMonth)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {activeEnrollment.courses?.name}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase ${
                      activeEnrollment.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      activeEnrollment.status === 'recovery' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {activeEnrollment.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {activeEnrollment.seasons?.name && (
                      <span>{activeEnrollment.seasons.name}</span>
                    )}
                    <span>Mes {currentMonth}/{totalMonths}</span>
                  </div>

                  {activeEnrollment.courses?.min_rank && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Rango mínimo requerido</p>
                      <p className="mt-0.5 text-sm font-medium text-white">{activeEnrollment.courses.min_rank}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Progreso del curso</span>
                      <span>{courseProgress}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${courseProgress}%`, background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress / Grades */}
            {grades && (
              <div className="glass rounded-[18px] p-6">
                <h3 className="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <Activity size={14} style={{ color: '#8B5CF6' }} />
                  Progreso
                </h3>

                <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Progreso General</span>
                    <span className="font-heading text-lg font-bold text-white">{grades.finalGrade ?? 0}%</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, grades.finalGrade ?? 0)}%`,
                        background: 'linear-gradient(90deg, #8B5CF6, #C4B5FD)',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {grades.examScore != null && (
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{(grades.examContribution ?? 0).toFixed(1)}%</p>
                      <p className="text-[11px] text-zinc-500">Examen</p>
                      <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (grades.examContribution ?? 0))}%` }} />
                      </div>
                    </div>
                  )}
                  {(grades.evalsContribution ?? 0) > 0 && (
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#8B5CF6' }}>{(grades.evalsContribution ?? 0).toFixed(1)}%</p>
                      <p className="text-[11px] text-zinc-500">Evaluaciones</p>
                      <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${Math.min(100, (grades.evalsContribution ?? 0))}%` }} />
                      </div>
                    </div>
                  )}
                  {(grades.attendanceContribution ?? 0) > 0 && (
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#10b981' }}>{(grades.attendanceContribution ?? 0).toFixed(1)}%</p>
                      <p className="text-[11px] text-zinc-500">Asistencia</p>
                      <div className="mt-1 h-1 w-full rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (grades.attendanceContribution ?? 0))}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {grades.evaluations && grades.evaluations.length > 0 && (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="mb-2 text-xs font-medium text-zinc-400">Evaluaciones</p>
                    <div className="space-y-2">
                      {grades.evaluations.slice(0, 5).map((ev: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 truncate flex-1 mr-2">{ev.title}</span>
                          <span className="font-medium text-white shrink-0">
                            {ev.score != null ? `${ev.score}/${ev.max_score}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coach Card */}
            {coachAssignment?.profiles && (
              <div className="glass rounded-[18px] p-6">
                <h3 className="mb-4 pb-3 text-sm font-semibold text-white flex items-center gap-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
                  <User size={14} style={{ color: '#8B5CF6' }} />
                  Coach
                </h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800 overflow-hidden">
                    {coachAssignment.profiles.avatar_url ? (
                      <img src={coachAssignment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User size={16} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {coachAssignment.profiles.display_name || coachAssignment.profiles.full_name}
                    </p>
                    <p className="text-xs text-zinc-500">Coach</p>
                  </div>
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
