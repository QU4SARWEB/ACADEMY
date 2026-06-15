'use client'

import { useEffect, useState } from 'react'
import { fetchAuditLogs } from '@/features/audit/actions'
import { Shield, Search } from 'lucide-react'

const MODULE_LABELS: Record<string, string> = {
  courses: 'Cursos',
  tasks: 'Tareas',
  enrollments: 'Inscripciones',
  promotions: 'Promociones',
  payments: 'Pagos',
  evaluations: 'Evaluaciones',
  grades: 'Notas',
  teams: 'Equipos',
  scrims: 'Scrims',
  schedules: 'Horarios',
  seasons: 'Seasons',
  profiles: 'Perfiles',
  auth: 'Auth',
}

const MODULES = Object.keys(MODULE_LABELS)

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState('')

  useEffect(() => {
    fetchAuditLogs({ module: moduleFilter || undefined, limit: 100 }).then((data) => {
      setLogs(data)
      setLoading(false)
    })
  }, [moduleFilter])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Logs de Auditoría</h1>
          <p className="mt-1 text-sm text-zinc-500">{logs.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <Search size={16} className="text-zinc-500" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
          >
            <option value="">Todos los módulos</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>{MODULE_LABELS[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="glass animate-pulse rounded-lg p-4">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Shield size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">Sin registros de auditoría.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <div key={log.id} className="glass rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-400">
                      {MODULE_LABELS[log.module] ?? log.module}
                    </span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                      {log.action}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white">
                    {log.profiles?.full_name ?? 'Unknown'}
                    {log.description && <span className="text-zinc-400"> — {log.description}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {new Date(log.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
