'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen, FileText, Video, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, use } from 'react'

export default function StudentCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [modules, setModules] = useState<any[]>([])
  const [materialsByModule, setMaterialsByModule] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: c } = await supabase.from('courses').select('*, seasons(name)').eq('id', id).maybeSingle()
      if (!c) { setLoading(false); return }
      setCourse(c)

      const { data: mods } = await supabase.from('course_modules').select('*').eq('course_id', id).order('display_order')
      const modList = mods ?? []
      setModules(modList)

      const moduleIds = modList.map(m => m.id)
      const { data: mats } = await supabase.from('materials').select('*').in('module_id', moduleIds.length > 0 ? moduleIds : ['none']).order('display_order')

      const byModule: Record<string, any[]> = {}
      for (const mat of mats ?? []) {
        if (!byModule[mat.module_id]) byModule[mat.module_id] = []
        byModule[mat.module_id]!.push(mat)
      }
      setMaterialsByModule(byModule)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: enrollment } = await supabase.from('enrollments').select('season_id').eq('profile_id', user.id).eq('course_id', id).eq('status', 'active').maybeSingle()
        if (enrollment) {
          const { data: payment } = await supabase.from('payments').select('status').eq('profile_id', user.id).eq('season_id', enrollment.season_id).order('created_at', { ascending: false }).maybeSingle()
          if (payment) setPaymentStatus(payment.status)
        }
      }

      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="h-24 animate-pulse rounded-xl bg-zinc-800/60" />
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div>
      <Link href="/students/courses" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a mis cursos
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{course.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {course.seasons?.name} · {course.duration_months} meses · Rango mínimo: {course.min_rank}
        </p>
        {course.description && <p className="mt-2 text-sm text-zinc-300">{course.description}</p>}
      </div>

      {paymentStatus === 'pending' && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          Pago pendiente —{' '}
          <Link href="/payments" className="underline hover:text-yellow-300">Sube tu comprobante aquí</Link>
        </div>
      )}
      {paymentStatus === 'paid' && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          Pago confirmado. ¡Disfruta del curso!
        </div>
      )}
      {paymentStatus === 'scholarship' && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-400">
          Este curso está cubierto por una beca.
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <Link href={`/students/courses/${course.id}/exams`} className="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6]/20 px-3 py-1.5 text-sm text-[#8B5CF6] transition hover:bg-[#8B5CF6]/30">
          <FileText size={14} /> Exámenes
        </Link>
        <Link href={`/students/courses/${course.id}/evaluations`} className="btn-glow-sm flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-500/30">
          <FileText size={14} /> Evaluaciones
        </Link>
      </div>

      <div className="space-y-4">
        {modules.length === 0 && (
          <p className="text-sm text-zinc-500">No hay módulos disponibles todavía.</p>
        )}
        {modules.map((mod) => {
          const materials = materialsByModule[mod.id] ?? []
          return (
            <div key={mod.id} className="glass rounded-xl p-5">
              <div className="mb-3 flex items-center gap-3">
                <BookOpen size={18} className="text-purple-400" />
                <div>
                  <h2 className="font-medium text-white">{mod.name}</h2>
                  <p className="text-xs text-zinc-500">Mes {mod.month_number}</p>
                </div>
              </div>

              {materials.length > 0 && (
                <div className="ml-8 space-y-2">
                  {materials.map((mat) => (
                    <div key={mat.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-2.5">
                      {mat.type === 'video' ? <Video size={14} className="text-blue-400" /> : mat.type === 'link' ? <ExternalLink size={14} className="text-green-400" /> : <FileText size={14} className="text-zinc-400" />}
                      <span className="flex-1 text-sm text-zinc-300">{mat.title}</span>
                      {mat.url && (
                        <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8B5CF6] hover:underline">
                          {mat.type === 'link' ? 'Abrir' : 'Descargar'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {materials.length === 0 && (
                <p className="ml-8 text-sm text-zinc-600">Sin materiales todavía.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
