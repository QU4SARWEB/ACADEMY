export interface ParsedQuestion {
  tempId: string
  stem: string
  type: QuestionType
  options: { text: string; correct: boolean }[]
  points: number
  sourceLine: number
  detectedPoints: boolean
  status: 'valid' | 'warning' | 'error'
  categories: string[]
}

export interface ParseResult {
  success: boolean
  questions: ParsedQuestion[]
  errors: ParseError[]
  warnings: ParseWarning[]
}

export interface ParseError {
  line: number
  message: string
  severity: 'error' | 'warning'
}

export interface ParseWarning {
  line: number
  message: string
}

export type QuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer' | 'open_ended' | 'tactical_scenario'

export interface BankQuestion {
  id: string
  course_id: string
  type: QuestionType
  stem: string
  explanation: string | null
  difficulty: number
  points: number
  is_active: boolean
  categories: string[]
  created_at: string
  options: { id: string; text: string; is_correct: boolean; order_num: number }[]
  course_name?: string
}

export type CategoryId = 'placement' | 'rookie' | 'trainee' | 'amateur' | 'competitor' | 'elite' | 'scrims' | 'maps' | 'roles' | 'mentality' | 'communication'

export interface QuestionCategory {
  id: CategoryId
  label: string
  color: string
}

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  { id: 'placement', label: 'Posicionamiento', color: '#10B981' },
  { id: 'rookie', label: 'Rookie', color: '#8B5CF6' },
  { id: 'trainee', label: 'Trainee', color: '#6D28D9' },
  { id: 'amateur', label: 'Amateur', color: '#EC4899' },
  { id: 'competitor', label: 'Competitor', color: '#F59E0B' },
  { id: 'elite', label: 'Elite', color: '#EF4444' },
  { id: 'scrims', label: 'Scrims', color: '#3B82F6' },
  { id: 'maps', label: 'Mapas', color: '#06B6D4' },
  { id: 'roles', label: 'Roles', color: '#14B8A6' },
  { id: 'mentality', label: 'Mentalidad', color: '#F97316' },
  { id: 'communication', label: 'Comunicación', color: '#8B5CF6' },
]

export function getCategoryLabel(id: string): string {
  return QUESTION_CATEGORIES.find(c => c.id === id)?.label || id
}

export function getCategoryColor(id: string): string {
  return QUESTION_CATEGORIES.find(c => c.id === id)?.color || '#8B5CF6'
}

export interface ReviewItem {
  id: string
  session_id: string
  attempt_id: string
  enrollment_id: string
  student_name: string
  exam_title: string
  course_name: string
  status: 'pending' | 'in_review' | 'completed'
  score: number | null
  pending_questions: number
  assigned_at: string | null
  completed_at: string | null
}

export interface GradeScale {
  value: number
  label: string
  color: string
}

export const GRADE_SCALE: GradeScale[] = [
  { value: 0, label: 'Incorrecto', color: 'text-red-400' },
  { value: 25, label: 'Muy deficiente', color: 'text-red-300' },
  { value: 50, label: 'Regular', color: 'text-yellow-400' },
  { value: 75, label: 'Bueno', color: 'text-green-400' },
  { value: 100, label: 'Excelente', color: 'text-green-300' },
]
