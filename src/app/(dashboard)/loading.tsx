export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800/60" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800/40" />
        ))}
      </div>
    </div>
  )
}
