import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

async function downloadFile(url: string, label: string): Promise<void> {
  try {
    const marker = '/object/public/'
    const idx = url.indexOf(marker)
    if (idx === -1) { window.open(url, '_blank'); return }
    const rest = url.slice(idx + marker.length).split('?')[0]
    const slash = rest.indexOf('/')
    if (slash === -1) { window.open(url, '_blank'); return }
    const bucket = rest.slice(0, slash)
    const path = decodeURIComponent(rest.slice(slash + 1))
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error || !data) throw error || new Error('download failed')
    const blobUrl = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = label || 'archivo'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    window.open(url, '_blank')
  }
}

export function openFileViewer(title: string, files: string[], startIndex: number): void {
  const items = files.map(f => {
    const name = decodeURIComponent((f.split('/').pop() || 'archivo').split('?')[0])
    const lower = name.toLowerCase()
    const kind = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(lower) ? 'image' : /\.pdf$/i.test(lower) ? 'pdf' : 'doc'
    return { url: f, kind, label: name }
  })
  if (items.length === 0) return

  const existing = document.getElementById('file-viewer')
  if (existing) existing.remove()
  const viewer = document.createElement('div')
  viewer.id = 'file-viewer'
  document.body.appendChild(viewer)

  let current = Math.min(Math.max(startIndex, 0), items.length - 1)

  const render = () => {
    const item = items[current]
    const main = item.kind === 'image'
      ? `<img src="${escapeHtml(item.url)}" class="max-h-[58vh] max-w-full object-contain mx-auto rounded-lg" alt="${escapeHtml(item.label)}" />`
      : item.kind === 'pdf'
        ? `<iframe src="${escapeHtml(item.url)}" class="h-[58vh] w-full rounded-lg border border-zinc-700 bg-white" title="${escapeHtml(item.label)}"></iframe>`
        : `<div class="flex flex-col items-center gap-4 py-20 text-center">
             <span class="text-zinc-500">${Icon('fileText', 52)}</span>
             <p class="text-sm text-zinc-300 break-all px-6">${escapeHtml(item.label)}</p>
             <button type="button" class="viewer-open-btn inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm text-white hover:bg-[#7C3AED]">${Icon('download', 14)} Descargar archivo</button>
           </div>`
    const thumbnails = items.map((it, i) => {
      const active = i === current ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/40' : 'border-zinc-700 hover:border-zinc-500'
      const thumb = it.kind === 'image'
        ? `<img src="${escapeHtml(it.url)}" class="h-full w-full object-cover" alt="${escapeHtml(it.label)}" />`
        : `<div class="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-900">
             <span class="text-zinc-500">${Icon('fileText', 18)}</span>
             <span class="px-1 text-center text-[8px] leading-tight text-zinc-500 line-clamp-2">${escapeHtml(it.label)}</span>
           </div>`
      return `<button type="button" class="viewer-thumb h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${active} ${i === current ? '' : 'opacity-60 hover:opacity-100'}" data-index="${i}">${thumb}</button>`
    }).join('')

    viewer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onclick="if(event.target===this)document.getElementById('file-viewer')?.remove()">
        <div class="glass flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl">
          <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <p class="truncate text-sm font-medium text-white">${escapeHtml(title)} · ${escapeHtml(item.label)}</p>
            <div class="flex items-center gap-2 shrink-0">
              <button id="viewer-download" type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 transition hover:bg-[#8B5CF6]/20 hover:text-[#A78BFA]" title="Descargar">${Icon('download', 13)} Descargar</button>
              <button id="close-viewer" type="button" class="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 transition hover:bg-red-500/20 hover:text-red-400" title="Cerrar">${Icon('x', 18)}</button>
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div class="relative flex min-h-[58vh] items-center justify-center">
              ${items.length > 1 ? `<button id="viewer-prev" class="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-zinc-800/90 p-2 text-white transition hover:bg-[#8B5CF6]">${Icon('chevronLeft', 20)}</button>` : ''}
              ${main}
              ${items.length > 1 ? `<button id="viewer-next" class="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-zinc-800/90 p-2 text-white transition hover:bg-[#8B5CF6]">${Icon('chevronRight', 20)}</button>` : ''}
            </div>
            ${items.length > 1 ? `
            <div class="mt-1">
              <p class="mb-2 text-[10px] uppercase text-zinc-500">${items.length} archivos · ${item.kind === 'image' ? 'Imagen' : item.kind === 'pdf' ? 'PDF' : 'Documento'} ${current + 1} de ${items.length}</p>
              <div class="viewer-thumbs flex gap-2 overflow-x-auto pb-2">${thumbnails}</div>
            </div>` : ''}
          </div>
        </div>
      </div>`
  }

  render()

  const nav = (i: number) => {
    current = (i + items.length) % items.length
    render()
  }

  viewer.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t.closest('#close-viewer')) { viewer.remove(); return }
    if (t.closest('#viewer-download')) { void downloadFile(items[current].url, items[current].label); return }
    if (t.closest('.viewer-open-btn')) { void downloadFile(items[current].url, items[current].label); return }
    if (t.closest('#viewer-next')) { nav(current + 1); return }
    if (t.closest('#viewer-prev')) { nav(current - 1); return }
    const thumb = t.closest<HTMLElement>('.viewer-thumb')
    if (thumb) { nav(parseInt(thumb.dataset.index || '0', 10)); return }
  })

  const keyHandler = (e: KeyboardEvent) => {
    if (!document.getElementById('file-viewer')) {
      document.removeEventListener('keydown', keyHandler)
      return
    }
    if (e.key === 'Escape') viewer.remove()
    else if (e.key === 'ArrowRight') nav(current + 1)
    else if (e.key === 'ArrowLeft') nav(current - 1)
  }
  document.addEventListener('keydown', keyHandler)
}
