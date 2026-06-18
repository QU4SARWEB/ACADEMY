import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderDashboardPage(pageHtml: string, pageTitle: string, backHref?: string): string {
  const backLink = backHref
    ? `<a href="#${escapeHtml(backHref)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
       ${Icon('arrowLeft', 16)} Volver</a>`
    : ''

  return `
    ${backLink}
    <h1 class="mb-6 font-heading text-2xl font-bold text-white">${escapeHtml(pageTitle)}</h1>
    ${pageHtml}`
}

export function DashboardContent(contentHtml: string): string {
  return `<div id="dash-content">${contentHtml}</div>`
}
