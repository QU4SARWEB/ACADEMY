const RANK_SPANISH: Record<string, string> = {
  'hierro': 'iron', 'iron': 'iron', 'bronce': 'bronze', 'bronze': 'bronze',
  'plata': 'silver', 'silver': 'silver', 'oro': 'gold', 'gold': 'gold',
  'platino': 'platinum', 'platinum': 'platinum', 'diamante': 'diamond', 'diamond': 'diamond',
  'ascendente': 'ascendant', 'ascendant': 'ascendant', 'inmortal': 'immortal', 'immortal': 'immortal',
  'radiante': 'radiant', 'radiant': 'radiant',
}

const RANK_IMAGES: Record<string, string> = {
  iron: '339241-iron3.png',
  bronze: '131724-bronze3.png',
  silver: '605271-silver3.png',
  gold: '492778-gold3.png',
  platinum: '929845-platinum3.png',
  diamond: '408823-diamond3.png',
  ascendant: '649213-ascendant3.png',
  immortal: '667392-immortal3.png',
  radiant: '16398-radiant.png',
}

export function rankImage(rank: string | null | undefined): string {
  if (!rank) return ''
  const key = RANK_SPANISH[rank.toLowerCase().split(' ')[0]] || ''
  return RANK_IMAGES[key] || ''
}

export function rankBadge(rank: string | null | undefined, size: number): string {
  const src = rankImage(rank)
  if (!src) return ''
  return `<img src="${src}" alt="${escapeHtmlAttr(rank || '')}" width="${size}" height="${size}" class="inline-block rank-badge" loading="lazy" decoding="async" title="${escapeHtmlAttr(rank || '')}" />`
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}