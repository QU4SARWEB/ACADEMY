'use client'

import Link from 'next/link'
import { Plus, ArrowLeft, BookOpen, FileText, GraduationCap, ClipboardCheck, Calculator, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { assignToCourse } from '@/features/enrollments/actions'
import { useEffect, useState, use } from 'react'

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [seasons, setSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: c } = await supabase.from('courses').select('*, seasons(name)').eq('id', id).maybeSingle()
      if (!c) { setLoading(false); return }
      setCourse(c)

      const [{ data: mods }, { data: enrs }, { data: ssn }] = await Promise.all([
        supabase.from('course_modules').select('*').eq('course_id', id).order('display_order'),
        supabase.from('enrollments').select('*, profiles(full_name, avatar_url)').eq('course_id', id),
        supabase.from('seasons').select('id, name').order('name'),
      ])
      setModules(mods ?? [])
      setEnrollments(enrs ?? [])
      setSeasons(ssn ?? [])

      const enrolledIds = (enrs ?? []).map((e) => e.profile_id)
      const { data: avail } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('role', ['student', 'player'])
        .eq('is_active', true)
        .not('id', 'in', `(${enrolledIds.length > 0 ? enrolledIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .order('full_name')
      setAvailableStudents(avail ?? [])

      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-800/60" />)}</div>
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-800/60" />)}</div>
        </div>
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div>
      <Link href="/coaches/courses" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a cursos
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">{course.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {course.seasons?.name} · Rango mínimo: {course.min_rank} · {course.duration_months} meses
          </p>
        </div>
        <Link href={`/coaches/courses/${id}/edit`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
          Editar
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href={`/coaches/courses/${id}/attendance`} className="btn-glow-sm flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800">
          <ClipboardCheck size={14} /> Asistencia
        </Link>
        <Link href={`/coaches/courses/${id}/exam`} className="btn-glow-sm flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800">
          <GraduationCap size={14} /> Examen
        </Link>
        <Link href={`/coaches/courses/${id}/exams`} className="btn-glow-sm flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800">
          <FileText size={14} /> Exámenes
        </Link>
        <Link href={`/coaches/courses/${id}/grades`} className="btn-glow-sm flex items-center gap-2 rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm text-purple-300 transition hover:bg-purple-600/30">
          <Calculator size={14} /> Notas
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Módulos</h2>
            <Link href={`/coaches/courses/${id}/modules/new`} className="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-sm text-white transition hover:bg-[#7C3AED]">
              <Plus size={14} /> Añadir
            </Link>
          </div>

          <div className="space-y-2">
            {modules.length === 0 && <p className="text-sm text-zinc-500">Sin módulos todavía.</p>}
            {modules.map((mod, i) => (
              <Link key={mod.id} href={`/coaches/courses/${id}/modules/${mod.id}`} className="glass glass-hover flex items-center gap-3 rounded-lg px-4 py-3">
                <BookOpen size={18} className="text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-white">{mod.name}</p>
                  <p className="text-xs text-zinc-500">Mes {mod.month_number}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Alumnos inscritos ({enrollments.length})</h2>
            <details className="relative">
              <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800">
                <UserPlus size={14} /> Asignar
              </summary>
              <div className="glass absolute right-0 top-full z-10 mt-2 w-72 rounded-xl p-4">
                <form action={assignToCourse} className="space-y-3">
                  <input type="hidden" name="courseId" value={id} />
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Alumno</label>
                    <select name="profileId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      <option value="">Seleccionar...</option>
                      {availableStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Temporada</label>
                    <select name="seasonId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Tipo</label>
                    <select name="type" className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      <option value="student">Estudiante</option>
                      <option value="player">Jugador</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                    Inscribir alumno
                  </button>
                </form>
              </div>
            </details>
          </div>
          <div className="space-y-2">
            {enrollments.length === 0 && <p className="text-sm text-zinc-500">Sin alumnos inscritos.</p>}
            {enrollments.map((enr) => (
              <div key={enr.id} className="glass flex items-center gap-3 rounded-lg px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                  {enr.profiles?.avatar_url ? <img src={enr.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : enr.profiles?.full_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{enr.profiles?.full_name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{enr.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
