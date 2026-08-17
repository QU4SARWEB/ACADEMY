export function clickToNav(e: MouseEvent, href: string): void {
  const t = e.target as HTMLElement
  if (t.closest('a, button, input, select, textarea, [data-no-nav]')) return
  location.hash = href
}
