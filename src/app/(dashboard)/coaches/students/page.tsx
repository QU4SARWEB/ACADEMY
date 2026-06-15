import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, riot_id, rank, is_active, scholarship, created_at')
    .eq('role', 'student')
    .order('full_name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Estudiantes</h1>
        <p className="mt-1 text-sm text-zinc-400">{students?.length ?? 0} estudiantes registrados</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#111]">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Riot ID</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Rango</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Beca</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Activo</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Registro</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Sin estudiantes registrados.</td>
              </tr>
            )}
            {(students ?? []).map((s) => (
              <tr key={s.id} className="border-b border-zinc-800 transition hover:bg-[#111]">
                <td className="px-4 py-3">
                  <Link href={`/coaches/students/${s.id}`} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                      {s.full_name.charAt(0)}
                    </div>
                    <span className="font-medium text-white">{s.full_name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-400">{s.email}</td>
                <td className="px-4 py-3 text-zinc-400">{s.riot_id ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{s.rank}</td>
                <td className="px-4 py-3 text-center">
                  {s.scholarship ? <span className="text-green-400">Sí</span> : <span className="text-zinc-500">No</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
