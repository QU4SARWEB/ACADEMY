'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/features/auth/actions'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-xl p-8">
          <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Te enviaremos un enlace para restablecerla
          </p>
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

          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}

          {state?.success && (
            <p className="text-sm text-green-400">
              Revisa tu email para restablecer la contraseña.
            </p>
          )}

          <button
            type="submit"
            disabled={pending || state?.success}
            className="btn-glow w-full rounded-lg bg-[#8B5CF6] px-4 py-2.5 font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
          >
            {pending ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/login" className="text-[#8B5CF6] hover:underline">
              Volver a inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
