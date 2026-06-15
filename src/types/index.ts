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
}

export interface CourseModule {
  id: string
  course_id: string
  name: string
  description: string | null
  month_number: number
  display_order: number
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
