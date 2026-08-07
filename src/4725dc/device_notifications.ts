const NOTIFICATION_BANNER_ID = 'device-notifications-banner'
const NOTIFICATION_BUTTON_ID = 'enable-device-notifications'
const SOUND_KEY = 'qu4sar-notification-sound'

let audioContext: AudioContext | null = null
let serviceWorkerRegistration: Promise<ServiceWorkerRegistration | null> | null = null

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = navigator.serviceWorker
      .register('./sw.js')
      .catch(() => null)
  }
  return serviceWorkerRegistration
}

function updateBanner(message?: string): void {
  const banner = document.getElementById(NOTIFICATION_BANNER_ID)
  if (!banner) return
  const copy = banner.querySelector<HTMLElement>('[data-notification-copy]')
  const button = document.getElementById(NOTIFICATION_BUTTON_ID) as HTMLButtonElement | null
  if (message && copy) copy.textContent = message
  if (button && Notification.permission === 'granted') button.textContent = 'Avisos activos'
  if (Notification.permission === 'granted') banner.classList.add('hidden')
}

export function playNotificationSound(): void {
  const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextConstructor) return
  if (!audioContext) audioContext = new AudioContextConstructor()
  if (audioContext.state === 'suspended') void audioContext.resume()

  const now = audioContext.currentTime
  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
  gain.connect(audioContext.destination)

  const oscillator = audioContext.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(740, now)
  oscillator.frequency.exponentialRampToValueAtTime(988, now + 0.12)
  oscillator.connect(gain)
  oscillator.start(now)
  oscillator.stop(now + 0.44)
}

export async function initDeviceNotifications(): Promise<void> {
  if (!supported()) {
    document.getElementById(NOTIFICATION_BANNER_ID)?.remove()
    return
  }

  if (Notification.permission === 'granted') {
    updateBanner()
    await registerServiceWorker()
  }

  document.getElementById('topbar-notification-btn')?.addEventListener('click', () => {
    if (Notification.permission !== 'granted') {
      document.getElementById(NOTIFICATION_BUTTON_ID)?.click()
    } else {
      updateBanner('Los avisos del dispositivo ya están activos.')
    }
  })

  document.getElementById(NOTIFICATION_BUTTON_ID)?.addEventListener('click', async () => {
    if (Notification.permission === 'denied') {
      updateBanner('Los avisos están bloqueados en el navegador. Actívalos desde la configuración del sitio.')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      updateBanner('Necesitamos permiso para enviarte avisos del sistema.')
      return
    }

    localStorage.setItem(SOUND_KEY, '1')
    updateBanner()
    await notifyDevice('QU4SAR Academy', 'Los avisos del dispositivo están activos.', window.location.hash || '#/')
  })
}

export async function notifyDevice(title: string, body: string, url = '#/'): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return

  const registration = await registerServiceWorker()
  const icon = new URL('qu4sar.svg', document.baseURI).toString()
  const options: NotificationOptions = {
    body,
    icon,
    badge: icon,
    tag: `qu4sar-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    data: { url },
  }

  if (registration) await registration.showNotification(title, options)
  else new Notification(title, options)
  if (localStorage.getItem(SOUND_KEY) === '1') playNotificationSound()
}
