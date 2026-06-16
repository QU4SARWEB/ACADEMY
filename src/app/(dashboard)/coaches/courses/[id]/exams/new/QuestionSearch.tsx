'use client'

export default function QuestionSearch({ questions }: { questions: any[] }) {
  return (
    <div>
      <input
        id="questionSearchInput"
        placeholder="Buscar preguntas por texto..."
        className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
      />
      <div id="questionSearchResults" className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-[#0A0A0A]" />
    </div>
  )
}
