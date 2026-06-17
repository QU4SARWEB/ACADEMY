'use client'

import Link from 'next/link'
import { ArrowLeft, GraduationCap, Award, CreditCard, CheckCircle, XCircle, AlertTriangle, BookOpen, UserMinus } from 'lucide-react'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import PaymentStatusBadge from '@/app/(dashboard)/payments/PaymentStatusBadge'
import { formatDate } from '@/lib/formatDate'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, use } from 'react'
import { assignToCourse } from '@/features/enrollments/actions'
import { promoteStudentAction, toggleScholarshipAction, toggleActiveAction, unenrollStudentAction } from './actions'

interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  riot_id: string | null
  rank: string
  country: string | null
  is_active: boolean
  scholarship: boolean
  social_discord: string | null
  social_twitter: string | null
  social_youtube: string | null
  institutional_email: string | null
}

interface Enrollment {
  id: string
  course_id: string
  season_id: string
  status: string
  promoted: boolean
  final_grade: number | null
  courses: { name: string; slug: string; min_rank: string; display_order: number } | null
  seasons: { name: string } | null
}

interface Course {
  id: string
  name: string
  display_order: number
  min_rank: string
}

interface Season {
  id: string
  name: string
  is_active: boolean
}

interface Promotion {
  id: string
  created_at: string
  grade_at_time: number | null
  rank_at_time: string | null
  from_course: { name: string } | null
  to_course: { name: string } | null
}

interface Eligibility {
  gradeOk: boolean
  rankOk: boolean
  eligible: boolean
  grade: number | null
  minRank: string
  studentRank: string
  reason: string | null
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [paymentBySeason, setPaymentBySeason] = useState<Map<string, string>>(new Map())
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [lastEnrollment, setLastEnrollment] = useState<Enrollment | null>(null)
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [nextCourse, setNextCourse] = useState<Course | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const [{ data: profileData }, { data: enrollData }, { data: coursesData }, { data: seasonsData }, { data: activeSeasonData }, { data: promotionData }, { data: paymentsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('enrollments').select('*, courses(name, slug, min_rank, display_order), seasons(name)').eq('profile_id', id).order('enrolled_at', { ascending: false }),
        supabase.from('courses').select('id, name, display_order, min_rank').eq('is_active', true).order('display_order'),
        supabase.from('seasons').select('id, name, is_active').order('name'),
        supabase.from('seasons').select('id').eq('is_active', true).maybeSingle(),
        supabase.from('promotions').select('*, from_course:from_course_id(name), to_course:to_course_id(name)').eq('profile_id', id).order('created_at', { ascending: false }),
        supabase.from('payments').select('season_id, status').eq('profile_id', id),
      ])

      if (!profileData) { setLoading(false); return }

      setProfile(profileData as Profile)
      const enr = (enrollData ?? []) as unknown as Enrollment[]
      setEnrollments(enr)
      setCourses((coursesData ?? []) as Course[])
      setSeasons((seasonsData ?? []) as Season[])
      setActiveSeason(activeSeasonData as Season | null)
      setPromotions((promotionData ?? []) as Promotion[])

      const pmap = new Map<string, string>()
      for (const p of paymentsData ?? []) pmap.set(p.season_id, p.status)
      setPaymentBySeason(pmap)

      const enrolledCourseIds = enr.map(e => e.course_id)
      const { data: availData } = enrolledCourseIds.length > 0
        ? await supabase.from('courses').select('id, name').eq('is_active', true).not('id', 'in', `(${enrolledCourseIds.join(',')})`).order('name')
        : await supabase.from('courses').select('id, name').eq('is_active', true).order('name')
      setAvailableCourses((availData ?? []) as Course[])

      const lastEnr = enr.find(e => e.status === 'active' || e.status === 'recovery')
      if (lastEnr) {
        setLastEnrollment(lastEnr)
        const { checkPromotionEligibility } = await import('@/services/promotions')
        const elig = await checkPromotionEligibility(supabase, lastEnr.id)
        setEligibility(elig as Eligibility)

        if (lastEnr.courses?.display_order) {
          const next = (coursesData ?? []).find((c: any) => c.display_order === lastEnr.courses!.display_order + 1)
          setNextCourse(next as Course ?? null)
        }
      }

      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return <p className="text-zinc-400">Estudiante no encontrado.</p>

  return (
    <div>
      <Link href="/coaches/students" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a estudiantes
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-2xl font-bold text-purple-400">
              {profile.full_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">{profile.full_name}</h1>
            <p className="text-sm text-zinc-400">{profile.email} · {profile.riot_id ?? 'Sin Riot ID'}</p>
            <p className="text-sm text-zinc-500">Rango: {profile.rank} · {profile.country ?? 'País no especificado'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <form action={toggleActiveAction}>
            <input type="hidden" name="studentId" value={id} />
            <input type="hidden" name="current" value={String(profile.is_active)} />
            <button className={`rounded-lg border px-4 py-2 text-sm transition ${profile.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
              {profile.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
          <form action={toggleScholarshipAction}>
            <input type="hidden" name="studentId" value={id} />
            <input type="hidden" name="current" value={String(profile.scholarship)} />
            <button className="flex items-center gap-2 rounded-lg border border-yellow-500/30 px-4 py-2 text-sm text-yellow-400 transition hover:bg-yellow-500/10">
              <Award size={14} />
              {profile.scholarship ? 'Quitar beca' : 'Dar beca'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-heading text-lg font-bold text-white">Inscripciones</h2>
          <div className="space-y-3">
            {enrollments.length === 0 && (
              <p className="text-sm text-zinc-500">Sin inscripciones.</p>
            )}
            {enrollments.map((enr) => (
              <div key={enr.id} className="rounded-lg border border-zinc-800 bg-[#111] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{enr.courses?.name}</p>
                    <p className="text-xs text-zinc-500">{enr.seasons?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm capitalize ${enr.status === 'active' ? 'text-green-400' : enr.status === 'recovery' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                      {enr.status}
                      {enr.promoted && ' · Promocionado'}
                    </p>
                    {enr.final_grade && <p className="text-xs text-zinc-500">Nota: {enr.final_grade}</p>}
                    <div className="mt-1">
                      {paymentBySeason.has(enr.season_id) ? (
                        <PaymentStatusBadge status={paymentBySeason.get(enr.season_id)!} />
                      ) : (
                        <span className="text-xs text-zinc-600">Sin pago</span>
                      )}
                    </div>
                  </div>
                  {(enr.status === 'active' || enr.status === 'recovery') && (
                    <ConfirmDeleteForm message="¿Dar de baja esta inscripción?" action={unenrollStudentAction}>
                      <input type="hidden" name="enrollmentId" value={enr.id} />
                      <input type="hidden" name="studentId" value={id} />
                      <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                        <UserMinus size={14} />
                      </button>
                    </ConfirmDeleteForm>
                  )}
                </div>
              </div>
            ))}
          </div>

          {promotions.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-4 font-heading text-lg font-bold text-white">Historial de Promociones</h2>
              <div className="space-y-2">
                {promotions.map((p) => (
                  <div key={p.id} className="rounded-lg border border-zinc-800 bg-[#111] p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap size={14} className="text-purple-400" />
                      <span className="text-zinc-300">{p.from_course?.name}</span>
                      {p.to_course && (
                        <>
                          <span className="text-zinc-600">→</span>
                          <span className="text-zinc-300">{p.to_course?.name}</span>
                        </>
                      )}
                      <span className="ml-auto text-xs text-zinc-500">{formatDate(p.created_at)}</span>
                    </div>
                    {p.grade_at_time && (
                      <p className="mt-1 text-xs text-zinc-500">Nota: {p.grade_at_time} · Rango: {p.rank_at_time}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 font-heading text-lg font-bold text-white">Promocionar</h2>
          <div className="rounded-lg border border-zinc-800 bg-[#111] p-4">
            {!lastEnrollment ? (
              <p className="text-sm text-zinc-500">Sin inscripción activa para promocionar.</p>
            ) : !eligibility ? (
              <p className="text-sm text-zinc-500">No se pudo verificar elegibilidad.</p>
            ) : (
              <>
                <div className="mb-4 space-y-2">
                  <h3 className="text-sm font-medium text-zinc-300">Requisitos</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Nota mínima (80)</span>
                    {eligibility.gradeOk !== undefined ? (
                      <span className={`flex items-center gap-1 ${eligibility.gradeOk ? 'text-green-400' : 'text-red-400'}`}>
                        {eligibility.gradeOk ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {eligibility.grade ?? '—'}/100
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Rango mínimo ({eligibility.minRank})</span>
                    <span className={`flex items-center gap-1 ${eligibility.rankOk ? 'text-green-400' : 'text-red-400'}`}>
                      {eligibility.rankOk ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {eligibility.studentRank}
                    </span>
                  </div>
                  {!eligibility.eligible && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-400">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>{eligibility.reason}</span>
                    </div>
                  )}
                  {eligibility.eligible && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                      <CheckCircle size={14} />
                      <span>Cumple todos los requisitos</span>
                    </div>
                  )}
                </div>

                <form action={promoteStudentAction} className="space-y-3">
                  <input type="hidden" name="studentId" value={id} />
                  <input type="hidden" name="enrollmentId" value={lastEnrollment.id} />
                  <input type="hidden" name="seasonId" value={activeSeason?.id ?? ''} />
                  <div>
                    <label className="block text-sm font-medium text-zinc-300">
                      {nextCourse ? 'Próximo curso' : 'Nuevo curso'}
                    </label>
                    {nextCourse ? (
                      <>
                        <input type="hidden" name="newCourseId" value={nextCourse.id} />
                        <p className="mt-1 text-sm text-zinc-400">{nextCourse.name}</p>
                      </>
                    ) : (
                      <select name="newCourseId" className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-white outline-none focus:border-[#8B5CF6]">
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {eligibility.eligible ? (
                    <button type="submit" className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                      <GraduationCap size={14} />
                      Promocionar a {nextCourse?.name ?? 'curso seleccionado'}
                    </button>
                  ) : (
                    <button type="submit" disabled className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600">
                      <GraduationCap size={14} />
                      No cumple requisitos
                    </button>
                  )}
                </form>
              </>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-[#111] p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-300">Información adicional</h3>
            <div className="space-y-1 text-sm text-zinc-500">
              <p>Redes: {[profile.social_discord, profile.social_twitter, profile.social_youtube].filter(Boolean).join(', ') || 'Ninguna'}</p>
              <p>Email institucional: {profile.institutional_email ?? 'No generado'}</p>
              <p>Beca: {profile.scholarship ? 'Sí (completa)' : 'No'}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-[#111] p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <BookOpen size={14} /> Inscribir en curso
            </h3>
            <form action={assignToCourse} className="mt-3 space-y-3">
              <div>
                <select name="courseId" required className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Seleccionar curso...</option>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <select name="seasonId" required className="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select name="type" className="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="student">Alumno</option>
                  <option value="player">Jugador</option>
                </select>
              </div>
            </form>
            {availableCourses.length === 0 && (
              <p className="mt-2 text-xs text-zinc-500">Ya está inscrito en todos los cursos.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
