export type Role = 'student' | 'player' | 'coach'

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name: string | null
  role: Role
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
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
  region: string | null
  mouse_dpi: number | null
  mouse_sens: number | null
  mouse_scope_sens: number | null
  mouse_hertz: number | null
  edpi: number | null
  role_color: string | null
  share_slug: string | null
  in_game_role: string | null
  skills: any | null
  quote: string | null
  custom_bg_url: string | null
  social_instagram: string | null
  social_tiktok: string | null
  social_github: string | null
  social_website: string | null
  social_facebook: string | null
  social_linkedin: string | null
  social_steam: string | null
  social_telegram: string | null
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
  type: 'video' | 'pdf' | 'image' | 'link' | 'embed'
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
  allow_pdf: boolean | null
  allow_image: boolean | null
  allow_video: boolean | null
  allow_audio: boolean | null
  allow_link: boolean | null
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
  season_id: string
  week_number: number
  day_of_week: number
  start_time: string
  end_time: string
  type: ScheduleType
  title: string | null
  description: string | null
  location: string | null
  timezone: string | null
}

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  profile_id: string
  season_id: string
  role: string
  status: string | null
  joined_at: string
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
  module_id: string | null
  title: string
  description: string | null
  time_limit_minutes: number | null
  passing_score: number
  max_score: number | null
  is_published: boolean
  weight: number | null
  shuffle: boolean | null
  max_attempts: number | null
  eval_type: string | null
  month: number | null
  is_active: boolean | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface ExamAttempt {
  id: string
  exam_id: string
  enrollment_id: string
  attempt_num: number | null
  score: number | null
  status: string | null
  started_at: string
  submitted_at: string | null
}

export interface Question {
  id: string
  course_id: string | null
  text: string
  stem: string | null
  type: string
  explanation: string | null
  difficulty: number | null
  points: number | null
  is_active: boolean
  created_at: string
  updated_at: string
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
