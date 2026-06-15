'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Sword,
  ClipboardList,
  Calendar,
  Trophy,
  GraduationCap,
  Award,
  Settings,
  Swords,
  Shield,
} from 'lucide-react'

const tabs = [
  { label: 'Dashboard', href: '/coaches/dashboard', icon: LayoutDashboard },
  { label: 'Cursos', href: '/coaches/courses', icon: BookOpen },
  { label: 'Estudiantes', href: '/coaches/students', icon: Users },
  { label: 'Jugadores', href: '/coaches/players', icon: Sword },
  { label: 'Tareas', href: '/coaches/tasks', icon: ClipboardList },
  { label: 'Evaluaciones', href: '/coaches/evaluations', icon: GraduationCap },
  { label: 'Promociones', href: '/coaches/promotions', icon: Award },
  { label: 'Horarios', href: '/coaches/schedules', icon: Calendar },
  { label: 'Seasons', href: '/coaches/seasons', icon: Trophy },
  { label: 'Equipos', href: '/coaches/teams', icon: Shield },
  { label: 'Scrims', href: '/coaches/scrims', icon: Swords },
  { label: 'Perfil', href: '/coaches/profile', icon: Settings },
]

export default function CoachNav({ coachName }: { coachName: string }) {
  const pathname = usePathname()

  return (
    <div className="border-b border-zinc-800 bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-3">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
