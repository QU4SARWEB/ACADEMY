'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/features/auth/actions'
import type { Role } from '@/types'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Calendar,
  Users,
  Swords,
  Trophy,
  CreditCard,
  Bell,
  Mail,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
  Award,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: Role[]
  hrefOverride?: Partial<Record<Role, string>>
  rootRoute?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['student', 'player', 'coach'] },
  { label: 'Cursos', href: '/courses', icon: <BookOpen size={20} />, roles: ['student', 'coach'] },
  { label: 'Tareas', href: '/tasks', icon: <ClipboardList size={20} />, roles: ['student', 'coach'] },
  { label: 'Horario', href: '/schedule', icon: <Calendar size={20} />, roles: ['student', 'player', 'coach'], hrefOverride: { coach: '/schedules' } },
  { label: 'Notas', href: '/grades', icon: <FileText size={20} />, roles: ['student'] },
  { label: 'Equipo', href: '/team', icon: <Users size={20} />, roles: ['player', 'coach'], hrefOverride: { coach: '/teams' } },
  { label: 'Scrims', href: '/scrims', icon: <Swords size={20} />, roles: ['player', 'coach'] },
  { label: 'Estudiantes', href: '/students', icon: <Users size={20} />, roles: ['coach'] },
  { label: 'Jugadores', href: '/players', icon: <Trophy size={20} />, roles: ['coach'] },
  { label: 'Evaluaciones', href: '/evaluations', icon: <GraduationCap size={20} />, roles: ['coach'] },
  { label: 'Promociones', href: '/promotions', icon: <Award size={20} />, roles: ['coach'] },
  { label: 'Seasons', href: '/seasons', icon: <Calendar size={20} />, roles: ['coach'] },
  { label: 'Pagos', href: '/payments', icon: <CreditCard size={20} />, roles: ['student', 'player', 'coach'], rootRoute: true },
  { label: 'Notificaciones', href: '/notifications', icon: <Bell size={20} />, roles: ['student', 'player', 'coach'], rootRoute: true },
  { label: 'Correo', href: '/mail', icon: <Mail size={20} />, roles: ['student', 'player', 'coach'], rootRoute: true },
  { label: 'Auditoría', href: '/logs', icon: <FileText size={20} />, roles: ['coach'], rootRoute: true },
  { label: 'Perfil', href: '/profile', icon: <Settings size={20} />, roles: ['student', 'player', 'coach'] },
]

export default function DashboardSidebar({ userId }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hasDebt, setHasDebt] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setRole(data.role as Role)
        setUserName(data.full_name)
        setAvatarUrl(data.avatar_url)
      })
  }, [userId])

  useEffect(() => {
    if (!role || role === 'coach') return
    const supabase = createClient()
    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .in('status', ['pending', 'expired'])
      .then(({ count }) => setHasDebt((count ?? 0) > 0))
  }, [role, userId])

  if (!role) return null

  const ROLE_TO_PREFIX: Record<string, string> = {
    coach: '/coaches',
    student: '/students',
    player: '/players',
  }
  const basePath = ROLE_TO_PREFIX[role] || `/${role}`

  const DEBT_ALLOWED_LABELS = ['Dashboard', 'Pagos', 'Perfil']

  let items = navItems.filter((item) => item.roles.includes(role))
  if (hasDebt) {
    items = items.filter((item) => DEBT_ALLOWED_LABELS.includes(item.label))
  }

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <img src="/qu4sar.ico" alt="QU4SAR" className="h-8 w-8" />
          {!collapsed && <span className="text-lg font-bold tracking-wider text-white">QU4SAR</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden rounded-md p-1 text-zinc-500 hover:text-white md:block"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const resolvedHref = item.hrefOverride?.[role] || item.href
          const href = item.rootRoute ? resolvedHref : `${basePath}${resolvedHref}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={item.href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
            </div>
          )}
        </div>
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <LogOut size={20} />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-zinc-800 bg-[#0A0A0A] p-2 text-zinc-400 transition hover:text-white md:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-zinc-800 bg-[#0A0A0A] transition-all duration-200 md:static md:block ${
          collapsed ? 'md:w-16' : 'md:w-60'
        } ${
          mobileOpen ? 'w-60 translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
