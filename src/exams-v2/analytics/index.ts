import { supabase } from '@/304244'
import { Spinner } from '@/4725dc/a14fa2'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderAnalytics(): string {
  return `
    <div class="mx-auto max-w-6xl">
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Analíticas de Exámenes</h1>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6" id="analytics-summary">
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-white" id="anl-exams">—</p>
          <p class="text-xs text-zinc-500">Exámenes</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-white" id="anl-attempts">—</p>
          <p class="text-xs text-zinc-500">Intentos</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-white" id="anl-passrate">—</p>
          <p class="text-xs text-zinc-500">Aprobación</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-white" id="anl-avgscore">—</p>
          <p class="text-xs text-zinc-500">Promedio</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div class="glass rounded-xl p-4">
          <h2 class="mb-3 font-heading text-base font-bold text-white">Preguntas más falladas</h2>
          <div id="anl-failed-questions" class="space-y-2">${Spinner()}</div>
        </div>
        <div class="glass rounded-xl p-4">
          <h2 class="mb-3 font-heading text-base font-bold text-white">Ranking de alumnos</h2>
          <div id="anl-ranking" class="space-y-2">${Spinner()}</div>
        </div>
      </div>

      <div class="mt-6 glass rounded-xl p-4">
        <h2 class="mb-3 font-heading text-base font-bold text-white">Evolución por examen</h2>
        <div id="anl-evolution" class="space-y-2">${Spinner()}</div>
      </div>
    </div>`
}

export async function initAnalytics(): Promise<void> {
  await loadSummary()
  await loadFailedQuestions()
  await loadRanking()
  await loadEvolution()
}

async function loadSummary(): Promise<void> {
  const { count: exams } = await supabase.from('exams').select('*', { count: 'exact', head: true })
  const { data: attempts } = await supabase.from('exam_attempts').select('score, status').neq('status', 'in_progress')

  const total = attempts?.length || 0
  const passed = (attempts || []).filter(a => (a.score || 0) >= 12).length
  const avgScore = total > 0 ? (attempts || []).reduce((s, a) => s + (a.score || 0), 0) / total : 0

  document.getElementById('anl-exams')!.textContent = String(exams || 0)
  document.getElementById('anl-attempts')!.textContent = String(total)
  document.getElementById('anl-passrate')!.textContent = total > 0 ? `${Math.round((passed / total) * 100)}%` : '0%'
  document.getElementById('anl-avgscore')!.textContent = avgScore > 0 ? `${Math.round(avgScore)}/20` : '—'
}

async function loadFailedQuestions(): Promise<void> {
  const container = document.getElementById('anl-failed-questions')
  if (!container) return

  const { data: rawData } = await supabase
    .from('student_answers')
    .select('*, questions!inner(stem, type)')
    .not('is_correct', 'is', null)
    .limit(100)
  const data = rawData as any[] || []

  if (data.length === 0) {
    container.innerHTML = '<p class="text-sm text-zinc-500">Sin datos aún</p>'
    return
  }

  const failCount: Record<string, { stem: string; total: number; incorrect: number }> = {}
  for (const a of data) {
    const key = a.question_id
    if (!failCount[key]) {
      failCount[key] = {
        stem: a.questions?.stem || 'Desconocida',
        total: 0,
        incorrect: 0,
      }
    }
    failCount[key].total++
    if (!a.is_correct) failCount[key].incorrect++
  }

  const sorted = Object.entries(failCount)
    .map(([id, q]) => ({ id, ...q, failRate: q.incorrect / q.total }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 10)

  container.innerHTML = sorted.length === 0
    ? '<p class="text-sm text-zinc-500">Sin datos aún</p>'
    : sorted.map((q, i) => {
        const pct = Math.round((1 - q.failRate) * 100)
        return `<div class="flex items-center justify-between text-sm">
          <span class="text-zinc-400 truncate flex-1">${i + 1}. ${escapeHtml(q.stem.substring(0, 60))}</span>
          <span class="text-xs font-medium ${pct >= 60 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'} ml-3">${pct}% ✅</span>
        </div>`
      }).join('')
}

async function loadRanking(): Promise<void> {
  const container = document.getElementById('anl-ranking')
  if (!container) return

  const { data: rawData } = await supabase
    .from('exam_attempts')
    .select('score, enrollments!inner(profile_id, profiles!inner(full_name, display_name))')
    .neq('status', 'in_progress')
    .not('score', 'is', null)
    .limit(200)
  const data = rawData as any[] || []

  if (data.length === 0) {
    container.innerHTML = '<p class="text-sm text-zinc-500">Sin datos aún</p>'
    return
  }

  const byStudent: Record<string, { name: string; scores: number[]; total: number }> = {}
  for (const a of data) {
    const profile = a.enrollments?.profiles
    const pid = a.enrollments?.profile_id
    if (!pid || !profile) continue
    const name = profile.display_name || profile.full_name || 'Desconocido'
    if (!byStudent[pid]) byStudent[pid] = { name, scores: [], total: 0 }
    byStudent[pid].scores.push(a.score || 0)
    byStudent[pid].total++
  }

  const ranked = Object.entries(byStudent)
    .map(([id, s]) => ({
      id,
      name: s.name,
      avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length,
      total: s.total,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  container.innerHTML = ranked.length === 0
    ? '<p class="text-sm text-zinc-500">Sin datos aún</p>'
    : ranked.map((s, i) => {
        const barWidth = Math.min(100, Math.round((s.avg / 20) * 100))
        return `<div class="flex items-center gap-3 text-sm">
          <span class="w-5 text-right text-xs font-bold text-zinc-500">#${i + 1}</span>
          <span class="w-32 truncate text-white">${escapeHtml(s.name)}</span>
          <div class="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div class="h-full rounded-full bg-[#8B5CF6] transition-all" style="width:${barWidth}%"></div>
          </div>
          <span class="w-12 text-right text-xs font-medium text-zinc-400">${Math.round(s.avg)}/20</span>
          <span class="text-xs text-zinc-600">${s.total} exams</span>
        </div>`
      }).join('')
}

async function loadEvolution(): Promise<void> {
  const container = document.getElementById('anl-evolution')
  if (!container) return

  const { data: rawData } = await supabase
    .from('exam_attempts')
    .select('score, submitted_at, exams!inner(title), enrollments!inner(profile_id, profiles!inner(full_name, display_name))')
    .neq('status', 'in_progress')
    .not('score', 'is', null)
    .order('submitted_at', { ascending: true })
    .limit(200)
  const data = rawData as any[] || []

  if (data.length === 0) {
    container.innerHTML = '<p class="text-sm text-zinc-500">Sin datos aún</p>'
    return
  }

  const byExam: Record<string, { title: string; scores: number[]; count: number }> = {}
  for (const a of data) {
    const title = a.exams?.title || 'Desconocido'
    if (!byExam[title]) byExam[title] = { title, scores: [], count: 0 }
    byExam[title].scores.push(a.score || 0)
    byExam[title].count++
  }

  container.innerHTML = Object.values(byExam)
    .sort((a, b) => b.count - a.count)
    .map(ex => {
      const avg = ex.scores.reduce((s, v) => s + v, 0) / ex.scores.length
      const barWidth = Math.min(100, Math.round((avg / 20) * 100))
      return `<div class="flex items-center gap-3 text-sm">
        <span class="w-40 truncate text-zinc-300">${escapeHtml(ex.title)}</span>
        <div class="flex-1 h-3 rounded-full bg-zinc-800 overflow-hidden">
          <div class="h-full rounded-full ${avg >= 12 ? 'bg-green-500' : avg >= 8 ? 'bg-yellow-500' : 'bg-red-500'} transition-all" style="width:${barWidth}%"></div>
        </div>
        <span class="w-16 text-right text-xs font-medium text-zinc-400">${Math.round(avg)}/20</span>
        <span class="text-xs text-zinc-600">${ex.count} attempts</span>
      </div>`
    }).join('')
}
