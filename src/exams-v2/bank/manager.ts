import { supabase } from '@/304244'
import type { BankQuestion } from '../shared/types'
import { toast } from '@/4725dc/4f2900'

export async function fetchQuestions(params: {
  courseId?: string
  type?: string
  category?: string
  difficulty?: number
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ data: BankQuestion[]; total: number }> {
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('questions')
    .select('*, courses!inner(name), question_options(*)', { count: 'exact' })

  if (params.courseId) query = query.eq('course_id', params.courseId)
  if (params.type) query = query.eq('type', params.type)
  if (params.difficulty) query = query.eq('difficulty', params.difficulty)
  if (params.search) query = query.ilike('stem', `%${params.search}%`)

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching questions:', error)
    return { data: [], total: 0 }
  }

  const mapped: BankQuestion[] = (data || []).map((q: any) => ({
    id: q.id,
    course_id: q.course_id,
    type: q.type,
    stem: q.stem,
    explanation: q.explanation,
    difficulty: q.difficulty,
    points: q.points,
    is_active: q.is_active ?? true,
    categories: q.categories || [],
    created_at: q.created_at,
    options: (q.question_options || []).sort((a: any, b: any) => a.order_num - b.order_num).map((o: any) => ({
      id: o.id,
      text: o.text,
      is_correct: o.is_correct,
      order_num: o.order_num,
    })),
    course_name: q.courses?.name || '',
  }))

  return { data: mapped, total: count || 0 }
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) {
    toast('error', `Error al eliminar: ${error.message}`)
    return false
  }
  toast('success', 'Pregunta eliminada')
  return true
}

export async function updateQuestion(id: string, updates: Partial<BankQuestion>): Promise<boolean> {
  const { error } = await supabase.from('questions').update(updates).eq('id', id)
  if (error) {
    toast('error', `Error al actualizar: ${error.message}`)
    return false
  }
  toast('success', 'Pregunta actualizada')
  return true
}

export async function bulkDeleteQuestions(ids: string[]): Promise<boolean> {
  const { error } = await supabase.from('questions').delete().in('id', ids)
  if (error) {
    toast('error', `Error al eliminar: ${error.message}`)
    return false
  }
  toast('success', `${ids.length} preguntas eliminadas`)
  return true
}
