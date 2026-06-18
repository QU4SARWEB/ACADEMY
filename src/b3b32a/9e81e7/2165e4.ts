import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderLogs(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initLogs(): Promise<void> {
  try {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name, email, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100)

    const logs = data ?? []

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Registro de auditoría</h1>
        <p class="mt-1 text-sm text-zinc-500">Actividad reciente del sistema</p>
      </div>
      <div class="space-y-2">
        ${logs.length === 0
          ? '<p class="text-sm text-zinc-500">No hay registros.</p>'
          : logs.map((l: any) => `
            <div class="glass rounded-lg px-4 py-2.5 text-sm flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6] overflow-hidden">
                  ${l.profiles?.avatar_url
                    ? `<img src="${escapeHtml(l.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                    : (l.profiles?.full_name?.charAt(0)?.toUpperCase() ?? '?')
                  }
                </div>
                <div class="min-w-0">
                  <span class="text-zinc-300">${escapeHtml(l.profiles?.full_name || 'Sistema')}</span>
                  <span class="text-zinc-500 mx-1">·</span>
                  <span class="text-zinc-400">${escapeHtml(l.module || '')}</span>
                  <span class="text-zinc-500 mx-1">·</span>
                  <span class="text-zinc-300">${escapeHtml(l.action || 'Acción')}</span>
                  ${l.description ? `<p class="text-xs text-zinc-500 truncate">${escapeHtml(l.description)}</p>` : ''}
                </div>
              </div>
              <span class="shrink-0 text-xs text-zinc-600">${formatDate(l.created_at)}</span>
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    if ((window as any).__channels?.logs) {
      supabase.removeChannel((window as any).__channels.logs)
    }
    const channel = supabase.channel('logs-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.logs = channel
    channel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        () => initLogs()
      )
      .subscribe()
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar logs</p>'
  }
}
