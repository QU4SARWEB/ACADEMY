import { escapeHtml } from '@/2b3583/e0ebc3'
import { signUp } from '@/fa53b9/fa53b9'
import { router } from '@/f3395c'
import { toast } from '@/4725dc/4f2900'

const RANKS = [
  { name: 'Unranked', hasDivision: false },
  { name: 'Hierro', hasDivision: true },
  { name: 'Bronce', hasDivision: true },
  { name: 'Plata', hasDivision: true },
  { name: 'Oro', hasDivision: true },
  { name: 'Platino', hasDivision: true },
  { name: 'Diamante', hasDivision: true },
  { name: 'Ascendente', hasDivision: true },
  { name: 'Inmortal', hasDivision: false },
  { name: 'Radiante', hasDivision: false },
]

export function renderRegister(): string {
  return `
    <div class="relative min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4">
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -right-32 top-1/4 h-64 w-64 rounded-full bg-[#6D28D9]/10 blur-3xl"></div>
      </div>

      <div class="glass relative z-10 w-full max-w-sm rounded-xl p-8">
        <div class="mb-6 text-center">
          <span class="font-heading text-3xl font-bold text-[#8B5CF6]">Q</span>
          <h1 class="mt-2 font-heading text-lg font-bold text-white">Crear cuenta</h1>
          <p class="mt-1 text-sm text-zinc-500">Únete a QU<span style="color:#8B5CF6">4</span>SAR Gaming Academy</p>
        </div>

        <form id="register-form" class="space-y-4">
          <div>
            <label for="fullName" class="mb-1 block text-xs font-medium text-zinc-400">Nombre completo</label>
            <input type="text" id="fullName" name="fullName" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="Tu nombre" />
          </div>

          <div>
            <label for="email" class="mb-1 block text-xs font-medium text-zinc-400">Correo electrónico</label>
            <input type="email" id="email" name="email" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="tu@correo.com" autocomplete="email" />
          </div>

          <div>
            <label for="password" class="mb-1 block text-xs font-medium text-zinc-400">Contraseña</label>
            <input type="password" id="password" name="password" required minlength="6"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
              placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Rango en Valorant</label>
            <div class="flex items-center gap-2">
              <select id="rank-name" name="rankName" required
                class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]">
                ${RANKS.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
              </select>
              <div id="rank-division-container" class="flex h-[42px] w-[60px] shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-[#0A0A0A]">
                <span id="rank-division-value" class="text-sm text-zinc-500">—</span>
              </div>
            </div>
            <div id="rank-division-picker" class="mt-2 hidden">
              <div class="flex gap-1">
                ${[1, 2, 3].map(n => `
                  <button type="button" data-div="${n}" class="rank-div-btn flex-1 rounded-lg border border-zinc-700 px-2 py-1 text-sm text-zinc-400 transition hover:border-[#8B5CF6] hover:text-white">${n}</button>
                `).join('')}
              </div>
            </div>
            <div id="rank-rr-container" class="mt-2 hidden">
              <input type="number" id="rank-rr" placeholder="RR (0-100)" min="0" max="100"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <input type="hidden" name="rank" id="rank-hidden" value="Unranked" />
          </div>

          <div>
            <label for="role" class="mb-1 block text-xs font-medium text-zinc-400">Rol</label>
            <select id="role" name="role" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]">
              <option value="student">Estudiante</option>
              <option value="player">Jugador competitivo</option>
            </select>
          </div>

          <p id="register-error" class="hidden text-xs text-red-400"></p>

          <button type="submit" id="register-submit"
            class="btn-glow flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50">
            Crear cuenta
          </button>
        </form>

        <p class="mt-4 text-center text-xs text-zinc-500">
          ¿Ya tienes cuenta? <a href="#/login" class="text-[#8B5CF6] hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>`
}

export function mountRegister(): void {
  const form = document.getElementById('register-form') as HTMLFormElement | null
  const errorEl = document.getElementById('register-error') as HTMLElement | null
  const submitBtn = document.getElementById('register-submit') as HTMLButtonElement | null

  // Rank selector logic
  const rankSelect = document.getElementById('rank-name') as HTMLSelectElement
  const divContainer = document.getElementById('rank-division-container')!
  const divValue = document.getElementById('rank-division-value')!
  const divPicker = document.getElementById('rank-division-picker')!
  const rrContainer = document.getElementById('rank-rr-container')!
  const rrInput = document.getElementById('rank-rr') as HTMLInputElement
  const rankHidden = document.getElementById('rank-hidden') as HTMLInputElement
  let selectedDiv = ''

  function updateRankDisplay() {
    const rankName = rankSelect.value
    const rank = RANKS.find(r => r.name === rankName)

    divPicker.classList.add('hidden')
    rrContainer.classList.add('hidden')
    divContainer.classList.remove('border-[#8B5CF6]')

    if (rankName === 'Unranked') {
      divValue.textContent = '—'
      selectedDiv = ''
      rankHidden.value = 'Unranked'
    } else if (rank?.hasDivision) {
      divPicker.classList.remove('hidden')
      divValue.textContent = selectedDiv || '?'
      rankHidden.value = selectedDiv ? `${rankName} ${selectedDiv}` : rankName
    } else {
      rrContainer.classList.remove('hidden')
      divValue.textContent = 'RR'
      rankHidden.value = rankName
    }
  }

  rankSelect.addEventListener('change', updateRankDisplay)

  document.querySelectorAll('.rank-div-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rank-div-btn').forEach(b => {
        b.classList.remove('border-[#8B5CF6]', 'bg-[#8B5CF6]/10', 'text-white')
        b.classList.add('text-zinc-400')
      })
      btn.classList.add('border-[#8B5CF6]', 'bg-[#8B5CF6]/10', 'text-white')
      btn.classList.remove('text-zinc-400')
      selectedDiv = (btn as HTMLElement).dataset.div!
      divValue.textContent = selectedDiv
      divContainer.classList.add('border-[#8B5CF6]')
      rankHidden.value = `${rankSelect.value} ${selectedDiv}`
    })
  })

  rrInput.addEventListener('input', () => {
    rankHidden.value = `${rankSelect.value} ${rrInput.value}`
  })

  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!submitBtn || !errorEl) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Creando cuenta...'
    errorEl.classList.add('hidden')

    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string
    const rank = rankHidden.value

    const result = await signUp(email, password, fullName, role, rank)

    if (result.error) {
      errorEl.textContent = result.error
      errorEl.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = 'Crear cuenta'
      return
    }

    toast('success', 'Cuenta creada. Revisa tu correo para confirmar.')
    router.navigate('/login')
  })
}
