export default function WelcomeLoading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-12">
      <div className="w-full animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-10 w-80 rounded bg-muted" />
        <div className="h-5 w-full max-w-2xl rounded bg-muted" />
        <div className="h-72 rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
