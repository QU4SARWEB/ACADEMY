import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/quasar.ico" alt="QU4SAR" className="h-8 w-8" />
          <span className="font-heading text-xl font-bold text-white">QU4SAR</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
          >
            Inscripción
          </Link>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="animate-float">
          <img src="/quasar.ico" alt="QU4SAR" className="mx-auto h-24 w-24" />
        </div>
        <h1 className="mt-8 font-heading text-5xl font-bold text-white md:text-7xl">
          <span className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] bg-clip-text text-transparent">
            QU4SAR
          </span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-zinc-400">
          Organización competitiva de Valorant Premier
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Academia · Scrims · Creación de contenido
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-3 font-medium text-white transition hover:bg-[#7C3AED]"
          >
            Únete ahora
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Iniciar sesión
          </Link>
          <a
            href="https://discord.gg/52X3NdNmG8"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow rounded-lg bg-[#5865F2] px-6 py-3 font-medium text-white transition hover:bg-[#4752C4]"
          >
            Discord
          </a>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-sm text-zinc-500">
        &copy; 2026 QU4SAR. Todos los derechos reservados.
      </footer>
    </div>
  )
}
