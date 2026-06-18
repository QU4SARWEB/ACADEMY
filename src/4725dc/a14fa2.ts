export function LoadingSkeleton(type: 'card' | 'list' | 'page' | 'table', count = 3): string {
  const card = `
    <div class="animate-pulse rounded-xl bg-zinc-800/50 p-4">
      <div class="mb-3 h-4 w-3/4 rounded bg-zinc-700" />
      <div class="h-3 w-1/2 rounded bg-zinc-700" />
    </div>`

  const list = `
    <div class="animate-pulse flex items-center gap-3 rounded-xl bg-zinc-800/50 p-4">
      <div class="h-10 w-10 rounded-lg bg-zinc-700" />
      <div class="flex-1">
        <div class="mb-2 h-4 w-1/2 rounded bg-zinc-700" />
        <div class="h-3 w-1/3 rounded bg-zinc-700" />
      </div>
    </div>`

  const table = `
    <div class="animate-pulse rounded-xl bg-zinc-800/50 p-4">
      <div class="mb-2 h-4 w-full rounded bg-zinc-700" />
      <div class="mb-2 h-4 w-5/6 rounded bg-zinc-700" />
      <div class="h-4 w-2/3 rounded bg-zinc-700" />
    </div>`

  const template = type === 'card' ? card : type === 'list' ? list : type === 'table' ? table : list
  return Array.from({ length: count }, () => template).join('')
}

export function Spinner(): string {
  return `
    <div class="flex flex-col items-center justify-center p-12">
      <div class="relative flex h-24 w-24 items-center justify-center">
        <div class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#8B5CF6]" style="animation-duration: 1s;"></div>
        <img src="/qu4sar.ico" alt="QU4SAR" class="h-14 w-14 animate-logo-pulse" />
      </div>
    </div>`
}

export function FullPageSpinner(): string {
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]">${Spinner()}</div>`
}
