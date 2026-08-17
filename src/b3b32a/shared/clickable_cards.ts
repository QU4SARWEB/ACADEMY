export function clickToNav(e: MouseEvent, href: string): void {
  const t = e.target as HTMLElement
  if (t.closest('a, button, input, select, textarea, [data-no-nav]')) return
  location.hash = href
}

export function initCarousel(): void {
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches
  const section = document.getElementById('page-content')
  if (!section) return

  let bar: HTMLDivElement | null = null
  let currentIdx = 0
  let items: Element[] = []

  function getCards(): Element[] {
    if (!section) return []
    const grid = section.querySelector<HTMLElement>('.rt-carousel')
    if (!grid) return []
    return Array.from(grid.children).filter((el): el is HTMLElement => el instanceof HTMLElement)
  }

  function updateCards() {
    items = getCards()
    if (!items.length) { hideBar(); return }
    if (!isMobile()) { hideBar(); return }
    showBar()
    updateActive()
  }

  function showBar() {
    if (!bar) {
      bar = document.createElement('div')
      bar.id = 'carousel-bar'
      bar.innerHTML = `
        <button id="carousel-prev" aria-label="Anterior" class="carousel-btn">${svgChevron('left')}</button>
        <div id="carousel-dots" class="flex gap-1.5"></div>
        <button id="carousel-next" aria-label="Siguiente" class="carousel-btn">${svgChevron('right')}</button>`
      document.body.appendChild(bar)
      bar.querySelector('#carousel-prev')!.addEventListener('click', prev)
      bar.querySelector('#carousel-next')!.addEventListener('click', next)
    }
    bar.classList.add('visible')
  }

  function hideBar() { bar?.classList.remove('visible') }

  function updateActive() {
    if (!bar) return
    const dots = bar.querySelector('#carousel-dots')
    if (!dots) return
    dots.innerHTML = items.map((_, i) =>
      `<span class="dot${i === currentIdx ? ' active' : ''}" data-i="${i}"></span>`
    ).join('')
    dots.querySelectorAll('.dot').forEach(d => {
      d.addEventListener('click', () => {
        const idx = parseInt((d as HTMLElement).dataset.i || '0', 10)
        items[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
  }

  function prev() {
    if (currentIdx > 0) {
      currentIdx--
      items[currentIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function next() {
    if (currentIdx < items.length - 1) {
      currentIdx++
      items[currentIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function observeCurrentCard() {
    if (!items.length || !isMobile()) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = items.indexOf(entry.target)
          if (idx >= 0 && idx !== currentIdx) {
            currentIdx = idx
            updateActive()
          }
        }
      })
    }, { threshold: 0.6 })
    items.forEach(el => observer.observe(el))
  }

  updateCards()
  observeCurrentCard()

  const resizeObs = new ResizeObserver(() => {
    updateCards()
    observeCurrentCard()
  })
  resizeObs.observe(section)

  ;(window as any).__carouselUpdate = () => { updateCards(); observeCurrentCard() }
}

function svgChevron(dir: 'left' | 'right'): string {
  const d = dir === 'left'
    ? '<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    : '<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  return `<svg width="16" height="16" viewBox="0 0 24 24">${d}</svg>`
}
