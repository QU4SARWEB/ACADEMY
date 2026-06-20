export type Role = 'student' | 'player' | 'coach'

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name: string | null
  role: Role
  avatar_url: string | null
  banner_url: string | null
  bio: string
  riot_id: string | null
  rank: string
  country: string | null
  social_discord: string | null
  social_youtube: string | null
  social_twitter: string | null
  social_twitch: string | null
  institutional_email: string | null
  scholarship: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  season_id: string
  name: string
  slug: string
  display_order: number
  min_rank: string
  duration_months: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  seasons?: { name: string } | null
}

export interface CourseModule {
  id: string
  course_id: string
  name: string
  description: string | null
  month_number: number
  display_order: number
  courses?: { name: string } | null
}

export interface Material {
  id: string
  module_id: string
  title: string
  type: 'video' | 'pdf' | 'doc' | 'link' | 'other'
  url: string
  description: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  profile_id: string
  season_id: string
  course_id: string
  type: 'student' | 'player'
  status: 'active' | 'recovery' | 'graduated' | 'inactive'
  current_module: number
  final_grade: number | null
  exam_score: number | null
  promoted: boolean
  enrolled_at: string
  courses?: Course | null
  seasons?: Season | null
}

export type TaskStatus = 'pending' | 'submitted' | 'reviewed' | 'graded' | 'late'

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late'

export type PaymentStatus = 'pending' | 'paid' | 'scholarship' | 'expired'

export type ScheduleType = 'academic' | 'competitive'

export type NotificationType = 'task' | 'evaluation' | 'schedule' | 'payment' | 'scrim' | 'system' | 'message' | 'grade' | 'promotion'

export interface Notification {
  id: string
  profile_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  profile_id: string
  season_id: string
  enrollment_id?: string
  type: string
  amount: number | null
  status: PaymentStatus
  paid_at: string | null
  method: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  module_id: string
  season_id: string
  title: string
  description: string | null
  due_date: string
  max_score: number | null
  created_at: string
  updated_at: string
  course_modules?: {
    name: string
    course_id: string
    courses: { name: string } | null
  } | null
}

export interface TaskSubmission {
  id: string
  task_id: string
  enrollment_id: string
  status: TaskStatus
  submission_text: string | null
  files: any[] | null
  links: any[] | null
  score: number | null
  feedback: string | null
  graded_by: string | null
  submitted_at: string
  graded_at: string | null
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  module_id: string
  title: string
  day_of_week: number
  start_time: string
  end_time: string
  type: ScheduleType
  location: string | null
  is_active: boolean
}

export interface Team {
  id: string
  name: string
  game: string
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  profile_id: string
  role: string
  joined_at: string
}

export interface Evaluation {
  id: string
  course_id: string
  title: string
  description: string | null
  max_score: number | null
  month: number | null
  type: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EvaluationResult {
  id: string
  evaluation_id: string
  enrollment_id: string
  score: number | null
  feedback: string | null
  graded_by: string | null
  graded_at: string | null
}

export interface Scrim {
  id: string
  team_id: string
  season_id: string
  opponent: string
  date: string
  result: string | null
  score_quasar: number | null
  score_opponent: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Exam {
  id: string
  course_id: string
  title: string
  description: string | null
  time_limit_minutes: number | null
  passing_score: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface ExamAttempt {
  id: string
  exam_id: string
  enrollment_id: string
  score: number | null
  started_at: string
  completed_at: string | null
}

export interface Question {
  id: string
  text: string
  type: string
  category: string | null
  is_active: boolean
  created_at: string
}

export interface Grade {
  id: string
  profile_id: string
  coach_id: string
  title: string
  category: string
  score: number
  comment: string | null
  source: string
  source_id: string | null
  created_at: string
}


