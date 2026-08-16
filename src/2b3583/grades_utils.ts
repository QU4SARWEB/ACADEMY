export const RANK_ORDER = ['', 'Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal', 'Radiante']

export function rankBase(r: string | null | undefined): string {
  if (!r) return ''
  const s = r.trim()
  for (const base of RANK_ORDER) {
    if (!base) continue
    if (s === base || s.startsWith(base + ' ')) return base
  }
  return ''
}

export function rankLevel(r: string | null | undefined): number {
  return RANK_ORDER.indexOf(rankBase(r))
}

export function meetsRank(studentRank: string | null | undefined, minRank: string | null | undefined): boolean {
  if (!minRank) return true
  return rankLevel(studentRank) >= rankLevel(minRank)
}

export const GRADE_WEIGHTS = { classes: 30, tasks: 20, exams: 25, final: 25 } as const
export const COMPONENT_LABELS: Record<keyof typeof GRADE_WEIGHTS, string> = {
  classes: 'Clases',
  tasks: 'Tareas',
  exams: 'Exámenes',
  final: 'Examen final',
}

export interface GradeComponents {
  classes: number | null
  tasks: number | null
  exams: number | null
  final: number | null
}

export interface RawScores {
  classScores: number[]
  taskScores: number[]
  recoveryTaskScores: number[]
  examScores: number[]
  recoveryExamScores: number[]
  finalScore: number | null
}

function avg(nums: number[]): number | null {
  return nums.length > 0 ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : null
}

export function recoveryAveraged(scores: number[], recoveryScores: number[]): number | null {
  if (recoveryScores.length > 0) {
    const bestRec = Math.max(...recoveryScores)
    if (scores.length === 0) return bestRec
    const withReplacement = [...scores]
    const lowestIdx = withReplacement.indexOf(Math.min(...withReplacement))
    withReplacement[lowestIdx] = Math.max(bestRec, withReplacement[lowestIdx])
    return avg(withReplacement)
  }
  return avg(scores)
}

export function computeComponents(raw: RawScores): GradeComponents {
  return {
    classes: avg(raw.classScores),
    tasks: recoveryAveraged(raw.taskScores, raw.recoveryTaskScores),
    exams: recoveryAveraged(raw.examScores, raw.recoveryExamScores),
    final: raw.finalScore,
  }
}

export function weightedFinal(comp: GradeComponents): number | null {
  let num = 0
  let den = 0
  for (const k of ['classes', 'tasks', 'exams', 'final'] as const) {
    const v = comp[k]
    if (v !== null && v !== undefined) {
      num += v * GRADE_WEIGHTS[k]
      den += GRADE_WEIGHTS[k]
    }
  }
  return den > 0 ? num / den : null
}

export function presentComponents(comp: GradeComponents): string[] {
  return (['classes', 'tasks', 'exams', 'final'] as const)
    .filter(k => comp[k] !== null && comp[k] !== undefined)
    .map(k => COMPONENT_LABELS[k])
}

export type GradeStatus = 'approved' | 'recovery' | 'failed' | 'pending' | 'none'

export function gradeStatus(final: number | null, minPass: number, pendingRecovery: boolean): GradeStatus {
  if (final === null) return 'none'
  if (final >= minPass) return 'approved'
  if (pendingRecovery) return 'recovery'
  return 'failed'
}

export interface CourseRef {
  scheduleIds: string[]
  tasks: { id: string; is_recovery: boolean; due_date?: string | null }[]
  exams: { id: string; is_final: boolean; is_recovery: boolean }[]
}

export function isTaskOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const today = new Date()
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return dueDate < localToday
}

export function buildRawScores(
  ref: CourseRef,
  classGrades: any[],
  submissions: any[],
  results: any[],
  studentId: string,
): RawScores {
  const classScores = classGrades
    .filter(g => g.student_id === studentId && ref.scheduleIds.includes(g.schedule_id))
    .map(g => (parseFloat(g.theory_score) || 0) + (parseFloat(g.practice_score) || 0))

  const taskScores: number[] = []
  const recoveryTaskScores: number[] = []
  const submittedTaskIds = new Set<string>()
  for (const sub of submissions) {
    if (sub.student_id !== studentId || sub.score == null) continue
    const task = ref.tasks.find(t => t.id === sub.task_id)
    if (!task) continue
    const v = parseFloat(sub.score)
    if (isNaN(v)) continue
    submittedTaskIds.add(task.id)
    if (task.is_recovery) recoveryTaskScores.push(v)
    else taskScores.push(v)
  }
  for (const task of ref.tasks) {
    if (task.is_recovery) continue
    if (submittedTaskIds.has(task.id)) continue
    if (!isTaskOverdue(task.due_date)) continue
    taskScores.push(0)
  }

  const examScores: number[] = []
  const recoveryExamScores: number[] = []
  let finalScore: number | null = null
  for (const r of results) {
    if (r.student_id !== studentId || r.status !== 'graded' || r.total_score == null) continue
    const exam = ref.exams.find(x => x.id === r.exam_id)
    if (!exam) continue
    const v = parseFloat(r.total_score)
    if (isNaN(v)) continue
    if (exam.is_final) finalScore = v
    else if (exam.is_recovery) recoveryExamScores.push(v)
    else examScores.push(v)
  }

  return { classScores, taskScores, recoveryTaskScores, examScores, recoveryExamScores, finalScore }
}

export function hasPendingRecovery(
  ref: CourseRef,
  results: any[],
  submissions: any[],
  studentId: string,
): boolean {
  const pendingExam = ref.exams.some(x =>
    x.is_recovery && !x.is_final &&
    !results.some(r => r.student_id === studentId && r.exam_id === x.id && r.status === 'graded'),
  )
  const pendingTask = ref.tasks.some(t =>
    t.is_recovery &&
    !submissions.some(s => s.student_id === studentId && s.task_id === t.id && s.score != null),
  )
  return pendingExam || pendingTask
}
