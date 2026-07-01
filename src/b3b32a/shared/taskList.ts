import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400', submitted: 'text-blue-400', reviewed: 'text-purple-400',
  graded: 'text-green-400', late: 'text-red-400',
}
const statusLabels: Record<string, string> = {
  pending: 'Pendiente', submitted: 'Entregada', graded: 'Calificada', late: 'Atrasada', reviewed: 'Revisión',
}

export function renderTaskGridHtml(tasks: any[], submissionMap: Record<string, any>, linkPrefix: string): string {
  if (tasks.length === 0) return '<p class="text-sm text-zinc-500">No hay tareas asignadas.</p>'

  return `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    ${tasks.map((t: any) => {
      const sub = submissionMap[t.id]
      let status = sub?.status || 'pending'
      if (!sub && t.due_date && new Date() > new Date(t.due_date)) status = 'late'
      return `
        <a href="#${linkPrefix}/tasks/${escapeHtml(t.id)}"
           class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
              ${Icon('clipboardList', 24)}
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-medium text-white truncate">${escapeHtml(t.title)}</h3>
              <p class="text-xs text-zinc-500">${t.max_score ? `Máx: ${t.max_score} pts` : 'Sin puntaje'}</p>
            </div>
          </div>
          <p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${t.description ? escapeHtml(t.description.substring(0, 80)) : 'Sin descripción'}</p>
          <div class="space-y-1 mb-3">
            <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('calendar', 12)} Límite: ${formatDate(t.due_date)}</div>
            ${sub?.score !== null && sub?.score !== undefined ? `<div class="flex items-center gap-2 text-xs text-green-400">${Icon('checkCircle', 12)} Nota: ${sub.score}</div>` : ''}
          </div>
          <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
            <span class="text-xs font-medium ${statusColors[status] || 'text-zinc-500'}">${statusLabels[status] || status}</span>
            <span class="text-xs text-zinc-500 group-hover:text-white transition">Ver →</span>
          </div>
        </a>`
    }).join('')}
  </div>`
}
