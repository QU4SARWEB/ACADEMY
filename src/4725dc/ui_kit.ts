import { Icon } from '@/2b3583/bd2119'

export interface EmptyStateOptions {
  icon: string
  title: string
  hint?: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ icon, title, hint, actionLabel, actionHref }: EmptyStateOptions): string {
  return `
    <div class="empty-state flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/20 px-6 py-14 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6]">${Icon(icon, 26)}</span>
      <div class="space-y-1">
        <p class="text-sm font-medium text-white">${title}</p>
        ${hint ? `<p class="text-xs text-zinc-500">${hint}</p>` : ''}
      </div>
      ${actionLabel && actionHref ? `
        <a href="${actionHref}" class="mt-1 rounded-lg border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-4 py-2 text-xs font-medium text-[#C4B5FD] transition hover:bg-[#8B5CF6]/20">
          ${actionLabel}
        </a>` : ''}
    </div>`
}

export interface ErrorStateOptions {
  icon: string
  title: string
  hint?: string
}

export function ErrorState({ icon, title, hint }: ErrorStateOptions): string {
  return `
    <div class="error-state flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-14 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">${Icon(icon, 26)}</span>
      <div class="space-y-1">
        <p class="text-sm font-medium text-red-300">${title}</p>
        ${hint ? `<p class="text-xs text-zinc-500">${hint}</p>` : ''}
      </div>
      <button type="button" data-error-retry
        class="mt-1 flex items-center gap-2 rounded-lg border border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800">
        ${Icon('refreshCw', 13)} Reintentar
      </button>
    </div>`
}

export function bindErrorRetry(container: HTMLElement | Document): void {
  container.querySelectorAll<HTMLElement>('[data-error-retry]').forEach(btn => {
    btn.addEventListener('click', () => typeof location !== 'undefined' && location.reload())
  })
}

export interface PagerOptions {
  page: number
  pageSize: number
  totalItems: number
  onPage?: (page: number) => void
}

export const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZES = [10, 20, 50]
const PAGE_SIZE_KEY = 'qu4sar-page-size'

export function currentPageSize(): number {
  try {
    const saved = Number(sessionStorage.getItem(PAGE_SIZE_KEY) || '')
    return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

function rangePages(page: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const set = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages])
  const sorted = [...set].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const out: number[] = []
  let prev = 0
  for (const n of sorted) {
    if (n - prev > 1) out.push(-1)
    out.push(n)
    prev = n
  }
  return out
}

export function Pagination({ page, pageSize, totalItems }: PagerOptions): string {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(totalItems, page * pageSize)
  const pages = rangePages(page, totalPages)
  const pageBtns = pages.map(n =>
    n < 0
      ? '<span class="px-1 text-zinc-600">…</span>'
      : `<button type="button" data-pager-page="${n}" ${n === page ? 'aria-current="page"' : ''} class="pager-btn h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition ${n === page ? 'bg-[#8B5CF6] text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}">${n}</button>`
  ).join('')

  return `
    <div class="flex flex-col-reverse items-center justify-between gap-3 border-t border-zinc-800/70 px-4 py-3 sm:flex-row">
      <p class="text-xs text-zinc-500">Mostrando <span id="pager-from">${from}</span>–<span id="pager-to">${to}</span> de <span id="pager-total">${totalItems}</span> resultados</p>
      <div class="flex items-center gap-1.5">
        <button type="button" data-pager-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} class="pager-btn flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-40" aria-label="Página anterior">${Icon('chevronLeft', 14)}</button>
        <div class="hidden items-center gap-1 sm:flex">${pageBtns}</div>
        <button type="button" data-pager-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} class="pager-btn flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-40" aria-label="Página siguiente">${Icon('chevronRight', 14)}</button>
      </div>
    </div>`
}

export function bindPager(mount: HTMLElement, opts: PagerOptions & { pageSize: number; totalItems: number; onPage?: (page: number) => void }): void {
  const isMount = mount.classList.contains('pager-mount') || mount.id.startsWith('pager-')
  const onChange = () => opts.onPage?.((Number((mount as HTMLElement).dataset.pagerPage) || 1))
  mount.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('[data-pager-page]') as HTMLElement | null
    if (!btn) return
    const target = Number(btn.dataset.pagerPage || '0')
    const totalPages = Math.max(1, Math.ceil(opts.totalItems / opts.pageSize))
    const page = Math.min(Math.max(1, target), totalPages)
    if (page === opts.page) return
    opts.onPage?.(page)
  })
}

export function SearchInput({ id, placeholder }: { id: string; placeholder: string }): string {
  return `
    <div class="relative">
      <input type="search" id="${id}" placeholder="${placeholder}" aria-label="${placeholder}"
        class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] pl-9 pr-8 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]" />
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">${Icon('search', 14)}</span>
      <button type="button" data-clear-search class="absolute right-3 top-1/2 hidden -translate-y-1/2 text-zinc-500 hover:text-white" aria-label="Limpiar búsqueda">${Icon('x', 14)}</button>
    </div>`
}

export function bindSearchInput(container: HTMLElement, inputId: string, onInput: (q: string) => void): () => string {
  const input = container.querySelector<HTMLInputElement>(`#${inputId}`)
  if (!input) return () => ''
  const clear = container.querySelector<HTMLElement>('[data-clear-search]')
  const apply = () => {
    const q = input.value.toLowerCase().trim()
    if (clear) clear.classList.toggle('hidden', !q)
    onInput(q)
  }
  input.addEventListener('input', apply)
  clear?.addEventListener('click', () => { input.value = ''; apply() })
  return () => input.value
}

export function initUiGlobals(): void {
  try { sessionStorage.setItem('qu4sar-page-size', String(currentPageSize())) } catch {}
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement
    const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    if (e.key === '/' && !typing) {
      const search = document.querySelector<HTMLInputElement>('input[type="search"]')
      if (search) {
        e.preventDefault()
        search.focus()
      }
    }
    if (e.key === 'Escape' && !typing) {
      document.querySelector('#sb-mobile-bottom-panel')?.classList.remove('open')
      document.querySelectorAll('#modal-root [id$="-modal"]').forEach(el => {
        if (!(el as HTMLElement).classList.contains('hidden')) (el as HTMLElement).classList.add('hidden')
      })
    }
  })
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const esc = (v: string | number | null | undefined): string => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n')
  downloadBlob('\uFEFF' + csv, filename, 'text/csv;charset=utf-8;')
}

function xmlEsc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportExcel(fileName: string, sheetName: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escapeCell = (v: string | number | null | undefined): string => {
    const text = String(v ?? '')
    const safe = text
      .replace(/^\s+|\s+$/g, '')
    return `<Cell><Data ss:Type="String">${xmlEsc(safe)}</Data></Cell>`
  }
  const headerRow = `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('')}</Row>`
  const bodyRows = rows.map(row => `<Row>${row.map(escapeCell).join('')}</Row>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${xmlEsc(sheetName)}">
  <Table>${headerRow}${bodyRows}</Table>
 </Worksheet>
</Workbook>`
  downloadBlob(xml, fileName, 'application/vnd.ms-excel;charset=utf-8')
}