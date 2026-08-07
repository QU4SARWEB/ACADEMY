import { supabase } from '@/304244'
import { signIn } from '@/fa53b9/fa53b9'
import { router } from '@/f3395c'
import { toast } from '@/4725dc/4f2900'
import { renderDiscordBanner, renderPublicNavbar, mountPublicNav } from '@/b3b32a/shared/public_nav'

export function renderLogin(session?: any): string {
  return `
     <div class="public-page relative min-h-screen bg-[#0A0A0A]">
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
      </div>

      ${renderDiscordBanner()}
      ${renderPublicNavbar(session, { active: 'login', links: false })}

      <div class="relative z-10 flex min-h-[calc(100vh-110px)] items-center justify-center px-4 pb-16">
       <div class="glass relative w-full max-w-sm rounded-xl p-8 public-enter public-enter--card">
        <div class="mb-6 text-center">
          <img src="QU4SARreducido.png" alt="QU4SAR" class="mx-auto h-12 w-12" />
          <h1 class="mt-3 font-heading text-lg font-bold text-white">Iniciar sesión</h1>
          <p class="mt-1 text-sm text-zinc-500">Accede a tu cuenta de QU<span class="text-[#8B5CF6]">4</span>SAR</p>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label for="email" class="mb-1 block text-xs font-medium text-zinc-400">Correo electrónico</label>
            <input type="email" id="email" name="email" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="tu@correo.com" autocomplete="email" />
          </div>

          <div>
            <label for="password" class="mb-1 block text-xs font-medium text-zinc-400">Contraseña</label>
            <input type="password" id="password" name="password" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="••••••••" autocomplete="current-password" />
          </div>

          <p id="login-error" class="hidden text-xs text-red-400"></p>

          <button type="submit" id="login-submit"
            class="btn-glow flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50">
            Entrar
          </button>
        </form>

        <div class="mt-4 text-center">
          <a href="#/reset-password" class="text-xs text-zinc-500 hover:text-white">¿Olvidaste tu contraseña?</a>
        </div>
        <p class="mt-4 text-center text-xs text-zinc-500">
          ¿No tienes cuenta? <a href="#/register" class="text-[#8B5CF6] hover:underline">Regístrate</a>
        </p>
      </div>
      </div>
    </div>`
}

export function mountLogin(): void {
  mountPublicNav()
  const form = document.getElementById('login-form') as HTMLFormElement | null
  const errorEl = document.getElementById('login-error') as HTMLElement | null
  const submitBtn = document.getElementById('login-submit') as HTMLButtonElement | null

  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!submitBtn || !errorEl) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Entrando...'
    errorEl.classList.add('hidden')

    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const result = await signIn(email, password)

    if (result.error) {
      errorEl.textContent = result.error
      errorEl.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = 'Entrar'
      return
    }

    if (result.redirect) {
      location.hash = result.redirect
    }
  })
}
