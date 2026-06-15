import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, BookOpen, FileText, Video, ExternalLink } from 'lucide-react'

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*, seasons(name)')
    .eq('id', id)
    .maybeSingle()

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', id)
    .order('display_order')

  const moduleIds = (modules ?? []).map((m) => m.id)
  const { data: allMaterials } = await supabase
    .from('materials')
    .select('*')
    .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
    .order('display_order')

  const materialsByModule: Record<string, typeof allMaterials> = {}
  for (const mat of allMaterials ?? []) {
    if (!materialsByModule[mat.module_id]) {
      materialsByModule[mat.module_id] = []
    }
    materialsByModule[mat.module_id]!.push(mat)
  }

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

      <div className="space-y-4">
        {(modules ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay módulos disponibles todavía.</p>
        )}
        {(modules ?? []).map((mod) => {
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
                      {mat.type === 'video' ? (
                        <Video size={14} className="text-blue-400" />
                      ) : mat.type === 'link' ? (
                        <ExternalLink size={14} className="text-green-400" />
                      ) : (
                        <FileText size={14} className="text-zinc-400" />
                      )}
                      <span className="flex-1 text-sm text-zinc-300">{mat.title}</span>
                      {mat.url && (
                        <a
                          href={mat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#8B5CF6] hover:underline"
                        >
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
