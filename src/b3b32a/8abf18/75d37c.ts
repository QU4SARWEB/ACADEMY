import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderCoachStudents(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachStudents(): void {
  ;(async () => {
    try {
      const [{ data: students }, { data: activeSeason }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
        supabase.from('seasons').select('id').eq('is_active', true).maybeSingle(),
      ])

      const seasonId = (activeSeason as any)?.id
      const studentIds = (students ?? []).map((s: any) => s.id)

      const [{ data: payments }, { data: enrollments }] = await Promise.all([
        seasonId && studentIds.length > 0
          ? supabase.from('payments').select('profile_id, status').eq('season_id', seasonId).in('profile_id', studentIds)
          : Promise.resolve({ data: [] }),
        studentIds.length > 0
          ? supabase.from('enrollments').select('profile_id, status').in('profile_id', studentIds)
          : Promise.resolve({ data: [] }),
      ])

      const paymentMap = new Map<string, string>()
      for (const p of payments ?? []) paymentMap.set(p.profile_id, p.status)

      const enrollmentMap = new Map<string, { count: number; anyActive: boolean }>()
      for (const e of enrollments ?? []) {
        const current = enrollmentMap.get(e.profile_id) || { count: 0, anyActive: false }
        current.count++
        if (e.status === 'active' || e.status === 'recovery') current.anyActive = true
        enrollmentMap.set(e.profile_id, current)
      }

      const html = `
        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">Estudiantes</h1>
          <p class="mt-1 text-sm text-zinc-500">${(students ?? []).length} estudiantes</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="pb-3 pr-4 font-medium"></th>
                <th class="pb-3 pr-4 font-medium">Nombre</th>
                <th class="pb-3 pr-4 font-medium">Email</th>
                <th class="pb-3 pr-4 font-medium">Riot ID</th>
                <th class="pb-3 pr-4 font-medium">Rango</th>
                <th class="pb-3 pr-4 font-medium">Beca</th>
                <th class="pb-3 pr-4 font-medium">Pago</th>
                <th class="pb-3 pr-4 font-medium">Activo</th>
                <th class="pb-3 pr-4 font-medium">Inscripciones</th>
                <th class="pb-3 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody>
              ${(students ?? []).length === 0
                ? '<tr><td colspan="10" class="pt-4 text-zinc-500">No hay estudiantes.</td></tr>'
                : (students ?? []).map((s: any) => {
                    const enrollment = enrollmentMap.get(s.id) || { count: 0, anyActive: false }
                    const paymentStatus = paymentMap.get(s.id)
                    const initial = (s.full_name || '?').charAt(0).toUpperCase()
                    return `
                      <tr class="border-b border-zinc-800/50">
                        <td class="py-3 pr-4">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                            ${s.avatar_url
                              ? `<img src="${escapeHtml(s.avatar_url)}" alt="" class="h-full w-full rounded-full object-cover" />`
                              : escapeHtml(initial)
                            }
                          </div>
                        </td>
                        <td class="py-3 pr-4">
                          <a href="#/coaches/students/${escapeHtml(s.id)}" class="text-white hover:text-[#8B5CF6] transition">${escapeHtml(s.full_name || 'Desconocido')}</a>
                        </td>
                        <td class="py-3 pr-4 text-zinc-400">${escapeHtml(s.email || '-')}</td>
                        <td class="py-3 pr-4 text-zinc-400">${escapeHtml(s.riot_id || '-')}</td>
                        <td class="py-3 pr-4 text-zinc-400">${escapeHtml(s.rank || 'Unranked')}</td>
                        <td class="py-3 pr-4">
                          <span class="text-xs ${s.scholarship ? 'text-yellow-400' : 'text-zinc-600'}">${s.scholarship ? 'Sí' : 'No'}</span>
                        </td>
                        <td class="py-3 pr-4">
                          ${paymentStatus
                            ? `<span class="inline-block rounded-full px-2 py-0.5 text-xs ${paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${escapeHtml(paymentStatus)}</span>`
                            : '<span class="text-xs text-zinc-600">—</span>'
                          }
                        </td>
                        <td class="py-3 pr-4">
                          <span class="inline-block h-2.5 w-2.5 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-red-500'}"></span>
                        </td>
                        <td class="py-3 pr-4 text-zinc-400">${enrollment.count}</td>
                        <td class="py-3 text-zinc-500 text-xs">${formatDate(s.created_at)}</td>
                      </tr>`
                  }).join('')
              }
            </tbody>
          </table>
        </div>`

      document.getElementById('page-content')!.innerHTML = html
    } catch (err) {
      console.error('Error loading students:', err)
      document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar estudiantes</p>'
    }
  })()
}
