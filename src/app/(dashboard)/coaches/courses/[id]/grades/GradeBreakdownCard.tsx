'use client'

import { useEffect, useState } from 'react'
import { getGradeBreakdown } from '@/features/grades/actions'
import { Button } from '@/components/ui'

export default function GradeBreakdownCard({
  enrollment,
  courseId,
}: {
  enrollment: any
  courseId: string
}) {
  const [breakdown, setBreakdown] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  async function load() {
    setLoading(true)
    const data = await getGradeBreakdown(enrollment.id)
    setBreakdown(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [enrollment.id])

  async function handleCalculate() {
    setCalculating(true)
    await getGradeBreakdown(enrollment.id)
    await load()
    setCalculating(false)
  }

  if (loading) {
    return (
      <div className="glass animate-pulse rounded-xl p-5">
        <div className="h-4 w-48 rounded bg-zinc-800" />
      </div>
    )
  }

  if (!breakdown) return null

  const passed = breakdown.finalGrade != null && breakdown.finalGrade >= 80

  return (
    <div className="glass rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
            {enrollment.profiles?.avatar_url ? (
              <img src={enrollment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              enrollment.profiles?.full_name?.charAt(0) ?? '?'
            )}
          </div>
          <div>
            <h3 className="font-medium text-white">{enrollment.profiles?.full_name}</h3>
            <p className="text-xs text-zinc-500">
              Examen: {breakdown.examScore ?? '—'}/100
            </p>
          </div>
        </div>
        <div className="text-right">
          {breakdown.finalGrade != null ? (
            <>
              <p className={`text-lg font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {breakdown.finalGrade}/100
              </p>
              <p className={`text-xs ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {passed ? 'Aprobado' : 'No aprobado'}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Sin calcular</p>
          )}
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Examen (50%)</span>
          <span className="text-white">{breakdown.examScore != null ? breakdown.examScore : '—'}/100</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Evaluaciones (35%)</span>
          <span className="text-white">{breakdown.evalsContribution.toFixed(1)} pts</span>
        </div>
        {breakdown.evaluations.map((ev: any) => (
          <div key={ev.id} className="flex items-center justify-between pl-4 text-xs text-zinc-500">
            <span>{ev.title}</span>
            <span>{ev.score != null ? `${ev.score}/${ev.max_score}` : '—'}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Asistencia (15%)</span>
          <span className="text-white">{breakdown.attendancePct.toFixed(1)}%</span>
        </div>
      </div>

      <div className="flex justify-end border-t border-zinc-800 pt-3">
        <Button size="sm" onClick={handleCalculate} disabled={calculating}>
          {calculating ? 'Calculando...' : 'Calcular nota final'}
        </Button>
      </div>
    </div>
  )
}
