import { resetPassword, updatePassword } from '@/fa53b9/fa53b9'
import { router } from '@/f3395c'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { renderDiscordBanner, renderPublicNavbar, mountPublicNav } from '@/b3b32a/shared/public_nav'
import { Icon } from '@/2b3583/bd2119'

const INITIAL_HASH = typeof location !== 'undefined' ? location.hash : ''

export function isRecoveryHash(): boolean {
  return location.hash.includes('type=recovery') || INITIAL_HASH.includes('type=recovery')
}

function authShell(body: string): string {
  return `
     <div class="public-page relative min-h-screen bg-[#0A0A0A]">
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
      </div>
      ${renderDiscordBanner()}
      ${renderPublicNavbar(undefined, { active: 'login', links: false })}
      <div class="relative z-10 flex min-h-[calc(100vh-110px)] items-center justify-center px-4 pb-16">
        ${body}
      </div>
    </div>`
}

export function renderResetPassword(): string {
  const hash = location.hash
  const isRecovery = isRecoveryHash()

  if (isRecovery) {
    return authShell(`
       <div class="glass relative w-full max-w-sm rounded-xl p-8 public-enter public-enter--card">
        <div class="mb-6 text-center">
           <span class="flex justify-center text-[#8B5CF6]">${Icon('keyRound', 30)}</span>
          <h1 class="mt-2 font-heading text-lg font-bold text-white">Nueva contraseña</h1>
        </div>
        <form id="update-password-form" class="space-y-4">
          <div>
            <label for="password" class="mb-1 block text-xs font-medium text-zinc-400">Nueva contraseña</label>
            <input type="password" id="password" name="password" required minlength="6"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
          </div>
          <p id="reset-error" class="hidden text-xs text-red-400"></p>
          <button type="submit" id="reset-submit"
            class="btn-glow flex w-full items-center justify-center rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50">
            Actualizar contraseña
          </button>
        </form>
      </div>`)
  }

  return authShell(`
       <div class="glass relative w-full max-w-sm rounded-xl p-8 public-enter public-enter--card">
        <div class="mb-6 text-center">
           <span class="flex justify-center text-[#8B5CF6]">${Icon('mail', 30)}</span>
          <h1 class="mt-2 font-heading text-lg font-bold text-white">Recuperar contraseña</h1>
          <p class="mt-1 text-sm text-zinc-500">Te enviaremos un enlace a tu correo</p>
        </div>
        <form id="reset-form" class="space-y-4">
          <div>
            <label for="email" class="mb-1 block text-xs font-medium text-zinc-400">Correo electrónico</label>
            <input type="email" id="email" name="email" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="tu@correo.com" autocomplete="email" />
          </div>
          <p id="reset-error" class="hidden text-xs text-red-400"></p>
          <p id="reset-success" class="hidden text-xs text-green-400"></p>
          <button type="submit" id="reset-submit"
            class="btn-glow flex w-full items-center justify-center rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50">
            Enviar enlace
          </button>
        </form>
        <p class="mt-4 text-center text-xs text-zinc-500">
          <a href="#/login" class="text-[#8B5CF6] hover:underline">Volver al inicio de sesión</a>
        </p>
      </div>`)
}

export function mountResetPassword(): void {
  mountPublicNav()
  const hash = location.hash
  const isRecovery = isRecoveryHash()

  if (isRecovery) {
    const form = document.getElementById('update-password-form') as HTMLFormElement | null
    const errorEl = document.getElementById('reset-error') as HTMLElement | null
    const submitBtn = document.getElementById('reset-submit') as HTMLButtonElement | null

    if (!form) return

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (!submitBtn || !errorEl) return

      submitBtn.disabled = true
      submitBtn.textContent = 'Actualizando...'
      errorEl.classList.add('hidden')

      const formData = new FormData(form)
      const password = formData.get('password') as string

      const result = await updatePassword(password)

      if (result.error) {
        errorEl.textContent = result.error
        errorEl.classList.remove('hidden')
        submitBtn.disabled = false
        submitBtn.textContent = 'Actualizar contraseña'
        return
      }

      toast('success', 'Contraseña actualizada. Inicia sesión.')
      router.navigate('/login')
    })
    return
  }

  const form = document.getElementById('reset-form') as HTMLFormElement | null
  const errorEl = document.getElementById('reset-error') as HTMLElement | null
  const successEl = document.getElementById('reset-success') as HTMLElement | null
  const submitBtn = document.getElementById('reset-submit') as HTMLButtonElement | null

  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!submitBtn || !errorEl || !successEl) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Enviando...'
    errorEl.classList.add('hidden')
    successEl.classList.add('hidden')

    const formData = new FormData(form)
    const email = formData.get('email') as string

    const result = await resetPassword(email)

    if (result.error) {
      errorEl.textContent = result.error
      errorEl.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = 'Enviar enlace'
      return
    }

    successEl.textContent = 'Revisa tu correo para el enlace de recuperación.'
    successEl.classList.remove('hidden')
    submitBtn.disabled = false
    submitBtn.textContent = 'Enviar enlace'
  })
}
