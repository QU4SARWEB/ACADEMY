'use client'

import { useEffect, useState } from 'react'

interface LoadingProps {
  fullPage?: boolean
  message?: string
}

const phases = [
  'Inicializando...',
  'Cargando módulos...',
  'Listo',
]

export function Loading({ fullPage, message }: LoadingProps) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (message) return
    const t1 = setTimeout(() => setPhase(1), 800)
    const t2 = setTimeout(() => setPhase(2), 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [message])

  const text = message ?? phases[phase]

  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute h-full w-full animate-spin rounded-full border-2 border-transparent border-t-[#8B5CF6]" />
        <div className="absolute h-3/4 w-3/4 animate-spin rounded-full border-2 border-transparent border-t-[#6D28D9] [animation-duration:1.5s]" />
        <span className="font-heading text-lg font-bold text-[#8B5CF6]">Q</span>
      </div>
      <p className="text-sm text-zinc-400">{text}</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              i <= phase ? 'bg-[#8B5CF6]' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-12">
      {content}
    </div>
  )
}
