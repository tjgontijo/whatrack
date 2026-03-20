export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-96 animate-pulse rounded-2xl bg-muted/50" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border border-border bg-muted/30"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/30" />
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    </div>
  )
}
