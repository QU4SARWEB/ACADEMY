import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import '../globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: 'QU4SAR | Valorant Premier Organization',
  description: 'QU4SAR (QSR) - Organización competitiva de Valorant Premier',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.variable} ${orbitron.variable} font-sans`}>
      {children}
    </div>
  )
}
