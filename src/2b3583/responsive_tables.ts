let observer: MutationObserver | null = null

function enhanceTable(table: HTMLTableElement): void {
  if (table.dataset.rt === '1') return
  table.dataset.rt = '1'

  const ths = Array.from(table.querySelectorAll<HTMLElement>('thead tr:last-child th'))
  const labels = ths.map(th => th.textContent?.trim() || '')

  table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(tr => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length <= 1) return
    tds.forEach((td, i) => {
      if (!td.hasAttribute('data-label')) {
        td.setAttribute('data-label', labels[i] || '')
      }
    })
  })
}

function scanAddedNodes(nodes: NodeList): void {
  nodes.forEach(node => {
    if (!(node instanceof HTMLElement)) return
    if (node.tagName === 'TABLE') enhanceTable(node as HTMLTableElement)
    node.querySelectorAll<HTMLTableElement>('table').forEach(enhanceTable)
  })
}

export function initResponsiveTables(): void {
  if (observer) return
  const target = document.getElementById('app') || document.body
  observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.addedNodes.length) scanAddedNodes(m.addedNodes)
    }
  })
  observer.observe(target, { childList: true, subtree: true })
  target.querySelectorAll<HTMLTableElement>('table').forEach(enhanceTable)
}
