import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: {
    default: 'QU4SAR | Valorant Premier Organization',
    template: '%s | QU4SAR',
  },
  description: 'QU4SAR (QSR) - Organización competitiva de Valorant Premier. Entrenamiento, cursos y scrims para jugadores.',
  openGraph: {
    title: 'QU4SAR | Valorant Premier Organization',
    description: 'Organización competitiva de Valorant Premier. Entrenamiento y competición.',
    siteName: 'QU4SAR',
    locale: 'es_ES',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${orbitron.variable}`}>
      <body className="min-h-screen bg-[#0A0A0A] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
