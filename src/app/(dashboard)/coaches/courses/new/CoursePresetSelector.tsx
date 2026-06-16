'use client'

const COURSE_DATA: Record<string, { order: number; minRank: string }> = {
  Rookie: { order: 1, minRank: 'Hierro' },
  Trainee: { order: 2, minRank: 'Bronce' },
  Amateur: { order: 3, minRank: 'Plata' },
  Competitor: { order: 4, minRank: 'Oro' },
  Elite: { order: 5, minRank: 'Platino' },
  'Semi-Pro': { order: 6, minRank: 'Diamante' },
  Pro: { order: 7, minRank: 'Ascendente' },
}

export default function CoursePresetSelector() {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const course = COURSE_DATA[e.currentTarget.value]
    if (!course) return
    const form = e.currentTarget.form
    if (!form) return
    const slugInput = form.elements.namedItem('slug') as HTMLInputElement
    const orderInput = form.elements.namedItem('displayOrder') as HTMLInputElement
    const rankInput = form.elements.namedItem('minRank') as HTMLInputElement
    if (slugInput) slugInput.value = e.currentTarget.value.toLowerCase()
    if (orderInput) orderInput.value = String(course.order)
    if (rankInput) rankInput.value = course.minRank
  }

  return (
    <select
      name="name"
      required
      onChange={handleChange}
      className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]"
    >
      <option value="">Seleccionar...</option>
      {Object.entries(COURSE_DATA).map(([name, data]) => (
        <option key={name} value={name}>{name} (rango mín: {data.minRank})</option>
      ))}
    </select>
  )
}
