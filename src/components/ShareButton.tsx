'use client'

import { Share2 } from 'lucide-react'

export default function ShareButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(window.location.href)}
      className={className ?? "flex items-center gap-1.5 rounded-lg border border-zinc-700/50 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-[#8B5CF6]/30 hover:text-white"}
    >
      <Share2 size={12} /> Compartir
    </button>
  )
}
