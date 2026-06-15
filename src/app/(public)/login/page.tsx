'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/features/auth/actions'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signIn, undefined)

  useEffect(() => {
    if (state?.success && state.redirect) {
      router.push(state.redirect)
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-xl p-8">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-white">QU4SAR</h1>
            <p className="mt-1 text-sm text-zinc-400">Inicia sesión en tu cuenta</p>
          </div>

          <form action={action} className="space-y-4">
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
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-400">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-glow w-full rounded-lg bg-[#8B5CF6] px-4 py-2.5 font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {pending ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/reset-password" className="text-[#8B5CF6] hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
            <span className="mx-2">·</span>
            <Link href="/register" className="text-[#8B5CF6] hover:underline">
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
