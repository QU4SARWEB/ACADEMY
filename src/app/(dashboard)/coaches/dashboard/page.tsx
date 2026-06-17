'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { BookOpen, Users, Sword, ClipboardList, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function CoachDashboard() {
  const [stats, setStats] = useState([
    { label: 'Estudiantes', value: 0, icon: Users, href: '/coaches/students', color: 'text-blue-400' },
    { label: 'Jugadores', value: 0, icon: Sword, href: '/coaches/players', color: 'text-green-400' },
    { label: 'Cursos activos', value: 0, icon: BookOpen, href: '/coaches/courses', color: 'text-purple-400' },
    { label: 'Tareas', value: 0, icon: ClipboardList, href: '/coaches/tasks', color: 'text-yellow-400' },
  ])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player'),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
    ]).then(([students, players, courses, tasks]) => {
      setStats([
        { label: 'Estudiantes', value: students.count ?? 0, icon: Users, href: '/coaches/students', color: 'text-blue-400' },
        { label: 'Jugadores', value: players.count ?? 0, icon: Sword, href: '/coaches/players', color: 'text-green-400' },
        { label: 'Cursos activos', value: courses.count ?? 0, icon: BookOpen, href: '/coaches/courses', color: 'text-purple-400' },
        { label: 'Tareas', value: tasks.count ?? 0, icon: ClipboardList, href: '/coaches/tasks', color: 'text-yellow-400' },
      ])
    })
  }, [])

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="glass glass-hover rounded-xl p-5"
          >
            <div className="flex items-center justify-between">
              <stat.icon size={24} className={stat.color} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <h2 className="font-heading text-lg font-bold text-white">Acciones rápidas</h2>
          <div className="mt-4 space-y-2">
            <Link href="/coaches/courses/new" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <BookOpen size={16} className="text-purple-400" />
              Crear nuevo curso
            </Link>
            <Link href="/coaches/tasks/new" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <ClipboardList size={16} className="text-purple-400" />
              Crear nueva tarea
            </Link>
            <Link href="/coaches/schedules" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <Calendar size={16} className="text-purple-400" />
              Programar horario
            </Link>
            <Link href="/coaches/students" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
              <Users size={16} className="text-purple-400" />
              Gestionar estudiantes
            </Link>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h2 className="font-heading text-lg font-bold text-white">Cursos</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-500">
            <p>Rookie → Trainee → Amateur → Competitor → Elite → Semi-Pro → Pro</p>
            <p className="mt-2 text-zinc-500">
              Cada curso tiene 2 meses de duración con módulos, materiales y evaluaciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
