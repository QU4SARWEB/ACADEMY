'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { useRouter } from 'next/navigation'
import { Loader } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ExamGradingForm({
  courseId,
  enrollments,
}: {
  courseId: string
  enrollments: any[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const enr of enrollments) {
      initial[enr.id] = enr.exam_score != null ? String(enr.exam_score) : ''
    }
    return initial
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      for (const enr of enrollments) {
        const val = scores[enr.id]
        if (val === '') {
          await supabase.from('enrollments').update({ exam_score: null }).eq('id', enr.id)
        } else {
          const num = parseFloat(val)
          if (!isNaN(num) && num >= 0 && num <= 100) {
            await supabase.from('enrollments').update({ exam_score: num }).eq('id', enr.id)
          }
        }
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            <th className="px-4 py-3 font-medium text-zinc-400">Alumno</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Nota (0–100)</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Estado</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enr: any) => (
            <tr key={enr.id} className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30">
              <td className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                  {enr.profiles?.avatar_url ? (
                    <img src={enr.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    enr.profiles?.full_name?.charAt(0) ?? '?'
                  )}
                </div>
                <span className="text-white">{enr.profiles?.full_name}</span>
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={scores[enr.id] ?? ''}
                  onChange={(e) => setScores((prev) => ({ ...prev, [enr.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="—"
                />
              </td>
              <td className="px-4 py-3">
                {scores[enr.id] !== '' && !isNaN(parseFloat(scores[enr.id])) && parseFloat(scores[enr.id]) >= 0 && parseFloat(scores[enr.id]) <= 100 ? (
                  <span className="text-xs text-green-400">Válido</span>
                ) : scores[enr.id] === '' ? (
                  <span className="text-xs text-zinc-600">Sin nota</span>
                ) : (
                  <span className="text-xs text-red-400">Inválido</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-zinc-800 px-4 py-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader size={14} className="animate-spin" /> : null}
          {saving ? 'Guardando...' : 'Guardar notas de examen'}
        </Button>
      </div>
    </div>
  )
}
