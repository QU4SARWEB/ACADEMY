import { Icon } from '@/2b3583/bd2119'

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumb(crumbs: Crumb[]): string {
  return `
    <nav class="mb-4 flex items-center gap-1.5 text-xs text-zinc-500" aria-label="Breadcrumb">
      ${crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        const sep = i > 0 ? `<span class="text-zinc-700">${Icon('chevronRight', 10)}</span>` : ''
        const content = isLast
          ? `<span class="text-zinc-300 font-medium" aria-current="page">${c.label}</span>`
          : c.href
            ? `<a href="${c.href}" class="hover:text-white transition">${c.label}</a>`
            : `<span>${c.label}</span>`
        return `${sep}${content}`
      }).join('')}
    </nav>`
}
