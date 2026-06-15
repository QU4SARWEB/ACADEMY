'use client'

import { useEffect, useState } from 'react'
import { getGradeBreakdown } from '@/features/grades/actions'
import { checkEligibility } from '@/features/promotions/actions'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function StudentGradeCard({
  enrollmentId,
  enrollment,
}: {
  enrollmentId: string
  enrollment: any
}) {
  const [breakdown, setBreakdown] = useState<any>(null)
  const [eligibility, setEligibility] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getGradeBreakdown(enrollmentId),
      checkEligibility(enrollmentId),
    ]).then(([bd, el]) => {
      setBreakdown(bd)
      setEligibility(el)
      setLoading(false)
    })
  }, [enrollmentId])

  const finalGrade = enrollment.final_grade
  const passed = finalGrade != null && finalGrade >= 80

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-white">{enrollment.courses?.name}</h3>
          <p className="text-sm text-zinc-500">{enrollment.seasons?.name}</p>
        </div>
        <div className="text-right">
          {finalGrade != null ? (
            <>
              <p className={`text-lg font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {finalGrade}/100
              </p>
              <p className={`text-xs ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {passed ? 'Aprobado' : 'No aprobado'}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">En curso</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-3 animate-pulse space-y-2">
          <div className="h-3 w-full rounded bg-zinc-800" />
          <div className="h-3 w-3/4 rounded bg-zinc-800" />
        </div>
      ) : (
        <>
          {breakdown && (
            <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Examen (50%)</span>
                <span className="text-white">{breakdown.examScore != null ? `${breakdown.examScore}/100` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Evaluaciones (35%)</span>
                <span className="text-white">{breakdown.evalsContribution.toFixed(1)} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Asistencia (15%)</span>
                <span className="text-white">{breakdown.attendancePct.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {eligibility && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
              eligibility.eligible
                ? 'bg-green-500/10 text-green-400'
                : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              {eligibility.eligible ? (
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {eligibility.eligible ? 'Listo para promocionar' : 'No cumple requisitos'}
                </p>
                {!eligibility.eligible && (
                  <p className="mt-0.5 text-xs opacity-80">{eligibility.reason}</p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 text-xs text-zinc-500">
            <p>Promoción mínima: 80 pts · Rango requerido: {enrollment.courses?.slug}</p>
          </div>
        </>
      )}
    </div>
  )
}
