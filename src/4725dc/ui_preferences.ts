export type UiPreferences = {
  font: 'inter' | 'jakarta' | 'space' | 'manrope' | 'dm' | 'rajdhani' | 'plex' | 'jetbrains' | 'orbitron' | 'system' | 'mono'
  density: 'comfortable' | 'compact'
  radius: 'soft' | 'sharp'
  secondary: string
  glow: 'soft' | 'bright'
  reduceMotion: boolean
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  font: 'inter',
  density: 'comfortable',
  radius: 'soft',
  secondary: '#6D28D9',
  glow: 'soft',
  reduceMotion: false,
}

export function readUiPreferences(userId?: string): UiPreferences {
  if (!userId) return { ...DEFAULT_UI_PREFERENCES }
  try {
    const raw = localStorage.getItem(`qu4sar-ui-preferences:${userId}`)
    if (!raw) return { ...DEFAULT_UI_PREFERENCES }
    const parsed = JSON.parse(raw)
    const secondary = typeof parsed.secondary === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.secondary)
      ? parsed.secondary
      : DEFAULT_UI_PREFERENCES.secondary
    return {
      font: ['jakarta', 'space', 'manrope', 'dm', 'rajdhani', 'plex', 'jetbrains', 'orbitron', 'system', 'mono'].includes(parsed.font) ? parsed.font : 'inter',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      radius: parsed.radius === 'sharp' ? 'sharp' : 'soft',
      secondary,
      glow: parsed.glow === 'bright' ? 'bright' : 'soft',
      reduceMotion: parsed.reduceMotion === true,
    }
  } catch {
    return { ...DEFAULT_UI_PREFERENCES }
  }
}

export function saveUiPreferences(userId: string, preferences: UiPreferences): void {
  localStorage.setItem(`qu4sar-ui-preferences:${userId}`, JSON.stringify(preferences))
}

export function fontStack(font: UiPreferences['font']): string {
  if (font === 'jakarta') return "'Plus Jakarta Sans', system-ui, sans-serif"
  if (font === 'space') return "'Space Grotesk', system-ui, sans-serif"
  if (font === 'manrope') return "'Manrope', system-ui, sans-serif"
  if (font === 'dm') return "'DM Sans', system-ui, sans-serif"
  if (font === 'rajdhani') return "'Rajdhani', system-ui, sans-serif"
  if (font === 'plex') return "'IBM Plex Mono', ui-monospace, monospace"
  if (font === 'jetbrains') return "'JetBrains Mono', ui-monospace, monospace"
  if (font === 'orbitron') return "'Orbitron', system-ui, sans-serif"
  if (font === 'system') return 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  if (font === 'mono') return 'ui-monospace, SFMono-Regular, Menlo, monospace'
  return "'Inter', system-ui, sans-serif"
}
