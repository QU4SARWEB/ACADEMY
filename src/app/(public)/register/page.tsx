'use client'

import { useActionState } from 'react'
import { signUp } from '@/features/auth/actions'
import Link from 'next/link'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-xl p-8">
          <div className="mb-8 text-center">
          <img src="/quasar.ico" alt="QU4SAR" className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="mt-1 text-sm text-zinc-400">Únete a QU4SAR Academy</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300">
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-zinc-300">
              Tipo de registro
            </label>
            <select
              id="role"
              name="role"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
            >
              <option value="student">Alumno</option>
              <option value="player">Jugador</option>
            </select>
          </div>

          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}

          {state?.success && (
            <p className="text-sm text-green-400">
              Registro exitoso. Ya puedes iniciar sesión.
            </p>
          )}

          {!state?.success && (
            <button
              type="submit"
              disabled={pending}
              className="btn-glow w-full rounded-lg bg-[#8B5CF6] px-4 py-2.5 font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {pending ? 'Registrando...' : 'Crear cuenta'}
            </button>
          )}
        </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#8B5CF6] hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
